// Checks a Stripe Checkout Session and, if it was paid, sends the PDF.
//   GET /api/download?session_id=cs_...&check=1  -> JSON status for the thank-you page
//   GET /api/download?session_id=cs_...          -> the PDF file itself
//
// Environment variables (Vercel > Project > Settings > Environment Variables):
//   STRIPE_SECRET_KEY      required. A restricted key with "Checkout Sessions: Read" is enough.
//   STRIPE_PAYMENT_LINK_ID optional. plink_... — only sessions from this Payment Link are accepted.
//   DOWNLOAD_DAYS          optional. How many days after purchase the link works (default 30).

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PDF_NAME = "A_tudat_alatti_hatalma.pdf";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

async function loadPdf() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(process.cwd(), "private", PDF_NAME),
    path.join(here, "..", "private", PDF_NAME),
  ];
  for (const p of candidates) {
    try { return await readFile(p); } catch {}
  }
  throw new Error("PDF not found in function bundle");
}

export async function GET(req) {
  const url = new URL(req.url);
  const id = url.searchParams.get("session_id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,}$/.test(id)) return json({ ok: false, error: "invalid" }, 400);

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return json({ ok: false, error: "config" }, 500);

  let session;
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (r.status === 404) return json({ ok: false, error: "not_found" }, 404);
    if (!r.ok) return json({ ok: false, error: "stripe" }, 502);
    session = await r.json();
  } catch {
    return json({ ok: false, error: "stripe" }, 502);
  }

  const linkId = process.env.STRIPE_PAYMENT_LINK_ID;
  if (linkId && session.payment_link !== linkId) return json({ ok: false, error: "not_found" }, 404);
  if (session.payment_status !== "paid") return json({ ok: false, error: "unpaid" }, 402);

  const days = Number(process.env.DOWNLOAD_DAYS || 30);
  if (Date.now() / 1000 - session.created > days * 86400) return json({ ok: false, error: "expired", days }, 410);

  if (url.searchParams.has("check")) {
    return json({ ok: true, email: session.customer_details?.email || null, days });
  }

  try {
    const pdf = await loadPdf();
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${PDF_NAME}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return json({ ok: false, error: "file" }, 500);
  }
}
