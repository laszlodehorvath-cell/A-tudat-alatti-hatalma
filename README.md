# A tudat alatti hatalma – sales site (Vercel + Stripe)

## How it works

1. The buyer clicks a buy button and pays on your **Stripe Payment Link**.
2. Stripe redirects them to `koszonjuk.html?session_id=…` on your site.
3. `/api/download` (a Vercel Function) asks Stripe whether that payment was really paid. Only then does it send the PDF.
4. The PDF in `private/` is never public. Only the function can read it.

## Files

| Path | What it is |
|---|---|
| `public/index.html` | The sales page (Stripe link already inserted) |
| `public/koszonjuk.html` | Thank-you and download page after payment |
| `api/download.js` | Checks the payment with Stripe and sends the PDF |
| `private/A_tudat_alatti_hatalma.pdf` | The e-book (not publicly reachable) |
| `vercel.json` | Serves only `public/`, bundles the PDF into the function |

---

## Deploy on Vercel

Before you deploy, in `public/koszonjuk.html` replace `ide@ird-az-email-cimed.hu` with your support email.

### Option A: GitHub (recommended)
1. Create a **private** GitHub repo and upload the contents of this folder (`api`, `private`, `public`, `package.json`, `vercel.json`, `README.md`).
2. Vercel → **Add New… → Project** → import the repo.
3. Framework Preset: **Other**. Leave the build settings empty. `vercel.json` handles them.
4. **Deploy**.

### Option B: Vercel CLI
```bash
npm i -g vercel
cd a-tudat-alatti-hatalma
vercel            # first time: creates the project
vercel --prod
```

### Environment variables
Vercel → your project → **Settings → Environment Variables** (environment: Production):

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | your restricted key `rk_live_…` (Checkout Sessions: Read only) |
| `STRIPE_PAYMENT_LINK_ID` | your `plink_…` ID (optional but recommended) |
| `DOWNLOAD_DAYS` | optional, default `30` |

After adding them, go to **Deployments → ⋯ → Redeploy**. Environment variables only apply to new deployments.

### Point Stripe to your site
Your site address is shown in Vercel, e.g. `https://a-tudat-alatti-hatalma.vercel.app` (or your own domain).
Stripe → Payment Links → your link → **Edit → After payment** → **Redirect customers to your website**:
```
https://YOUR-ADDRESS/koszonjuk.html?session_id={CHECKOUT_SESSION_ID}
```

### Test
Buy once yourself with the live link. You should land on the "Köszönjük" page, and **PDF letöltése** should download the book. Then refund yourself in Stripe (Payments → the payment → Refund).

---

## When the countdown ends
The page disables its buttons by itself (deadline is in `CONFIG` at the bottom of `public/index.html`). Also **deactivate the Payment Link** in Stripe, so old links stop working.

## Before going live (not handled by this code)
- **Invoices (számla):** every sale needs an invoice reported to NAV. Stripe doesn't do this. Use e.g. Számlázz.hu or Billingo (both can connect to Stripe).
- **Legal pages:** ÁSZF, Adatkezelési tájékoztató, Impresszum, and the buyer's consent to losing the 14-day withdrawal right for an instant digital download.
- **VAT:** check with your accountant, especially for buyers in other EU countries.
