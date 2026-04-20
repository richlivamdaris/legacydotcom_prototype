# CLAUDE.md

## Project goal
Build a local-first prototype that demonstrates a real Stripe invoice/payment flow end to end:
- React UI for the demo flow
- Node.js backend for Stripe API calls
- Local webhook handling using Stripe CLI forwarding
- Stripe test mode only

## Primary constraints
- Optimize for working localhost demo first.
- Prefer the simplest implementation that proves the flow.
- Use Stripe test mode only. Never use live keys in local development.
- Keep payment logic on the server.
- Keep webhook verification mandatory.
- Avoid unnecessary abstractions, frameworks, or dependency bloat.
- Do not build production-grade architecture unless explicitly requested.

## Tech stack
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Dev tooling: Vite for the frontend
- Payments: Stripe
- Webhooks: Stripe CLI forwarded to local server
- Styling: plain CSS or CSS Modules only

## Architecture
- `apps/web` for the React app
- `apps/api` for the Node/Express API
- `apps/api/src/routes/stripe.ts` for Stripe API endpoints
- `apps/api/src/routes/webhook.ts` for webhook handling
- `apps/web/src/features/stripe-demo` for the demo UI
- `apps/api/src/services/stripe.ts` for Stripe SDK setup
- `apps/api/src/services/invoicing.ts` for invoice logic

## Stripe rules
- Create invoices on the backend only.
- Use test customers, test invoices, and test cards only.
- Handle invoice lifecycle events through webhooks.
- Verify webhook signatures using the local signing secret from Stripe CLI.
- Treat `invoice.paid` as the main success event for invoice payment completion.
- Handle `invoice.payment_failed` and `invoice.finalized` as part of the demo.
- Keep webhook handlers idempotent.
- Log event ids and event types for debugging.

## Local development rules
- The app must run fully on localhost.
- Use Stripe CLI forwarding for webhook delivery.
- The UI should never call Stripe secret-key operations directly.
- Keep environment variables in `.env.local`.
- Document the exact commands needed to run frontend, backend, and webhook forwarding.
- Always use Serena MCP tools where possible to read code and save tokens

## API rules
- Use REST endpoints with simple request/response shapes.
- Return JSON only.
- Keep endpoints small and specific.
- Prefer explicit routes over generic controllers.
- Validate inputs on the server before calling Stripe.
- Fail fast with clear errors.

## UI rules
- Build only the screens needed to demo the Stripe flow.
- Keep the UI simple and functional.
- Show the current invoice state clearly.
- Include loading, success, and error states.
- Use mock data only where Stripe data is not yet available.
- Avoid over-styling.

## Code style
- Use TypeScript strict mode.
- Prefer named exports.
- Use functional components and hooks only.
- Keep files small and feature-focused.
- Use `async/await`.
- Avoid deep nesting.
- Avoid default exports unless required by the framework.

## Testing rules
- Add tests for webhook signature verification.
- Add tests for invoice state transitions if practical.
- Prefer a few high-value tests over broad coverage.
- Do not add a large test framework setup unless the project already has one.

## Error handling
- Surface Stripe errors clearly.
- Log full server-side errors, but show simple messages in the UI.
- Never swallow webhook failures.
- Return appropriate HTTP status codes from webhook and API routes.

## Commands
- Frontend dev: `npm run dev --workspace web`
- Backend dev: `npm run dev --workspace api`
- Stripe webhook listener: `stripe listen --forward-to localhost:3001/webhook`
- Run tests: `npm test`
- Build: `npm run build`

## What to avoid
- No Redux.
- No heavy UI libraries.
- No microservices.
- No database unless the demo truly needs persistence.
- No auth unless the prototype requires users.
- No background job system.
- No production hardening work until the flow is proven.

