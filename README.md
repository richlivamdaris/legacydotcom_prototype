# Memoriams Portal — Prototype

Local-first prototype that demonstrates a real Stripe invoice/payment flow end to end, per the product brief in `Memoriams_Portal_Product_Brief_and_User_Stories.md`.

## Structure

- `apps/api` — Node + Express + TypeScript. Stripe invoicing and webhook handler.
- `apps/web` — Vite + React + TypeScript. Minimal demo UI.

## Setup

1. Install deps from the repo root:
   ```bash
   npm install
   ```

2. Set Stripe test-mode keys in `apps/api/.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
   The publishable key is already set in `apps/web/.env.local` (test-mode, safe in browser).

3. Get `STRIPE_WEBHOOK_SECRET` by running the Stripe CLI once:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3001/webhook
   ```
   Copy the printed `whsec_...` into `apps/api/.env.local`. It rotates per `stripe listen` session.

## Run (three terminals)


Terminal 1 — API:
```bash
npm run dev:api
```

Terminal 2 — Web:
```bash
npm run dev:web
```

Terminal 3 — Stripe webhook forwarding:
```bash
winget install -e --id Stripe.StripeCli
stripe listen --forward-to localhost:3001/webhook
```

Open http://localhost:5173.

## Demo flow

1. Fill in the obituary order form → "Create Stripe invoice".
2. The API creates a Stripe customer, invoice item, and finalized invoice, then returns the `hosted_invoice_url`.
3. Click **Open hosted invoice** and pay with test card `4242 4242 4242 4242`.
4. Watch the API terminal for webhook events: `invoice.finalized`, `invoice.paid`.
5. The recent invoices panel auto-refreshes every 5s and reflects the `paid` status.

## Prototype scope

This is the first cut — the invoice/payment backbone for the Automated Billing pillar. Loyalty earn/redeem, account status, order adjustments, and the full screen set from the brief come next and can be directed by Figma screens.

## Hint

npx skills add -y https://docs.stripe.com
