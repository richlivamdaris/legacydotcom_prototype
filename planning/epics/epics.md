---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
status: complete
completedAt: 2026-04-23
inputDocuments:
  - planning/prd.md
  - planning/architecture.md
workflowType: epics-and-stories
project_name: Obituaries Portal
user_name: Richard.livingstone
date: 2026-04-23
outputPath: planning/epics/epics.md
targetStack: JDK 17 + Spring Boot / JSP + JSTL + jQuery 3.6.1 + jQuery UI + Bootstrap / MySQL + Hibernate / Stripe / AWS EC2
---

# Obituaries Portal — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for the Obituaries Portal module, decomposing the requirements from the PRD and Architecture decisions into implementable stories for the existing Legacy.com Spring Boot / JSP / MySQL platform.

**Scope anchor:** MVP delivers ~46 FRs; Growth delivers ~19 FRs behind feature flags; Vision is out of this PRD's commitment scope. Every story maps to at least one FR/NFR plus an architectural decision (D1–D37) or implementation pattern.

## Requirements Inventory

### Functional Requirements

**Sign-in and Tenant Context**

- FR1 [MVP] Funeral-home users can sign in using the existing Legacy.com sign-in model, without this module handling usernames or passwords directly.
- FR2 [MVP] On successful sign-in, the portal resolves the user's funeral-home identity from the existing platform session.
- FR3 [MVP] The portal scopes every user-facing data query to the user's funeral home and rejects any cross-tenant read or mutate attempt.
- FR4 [MVP] Legacy internal operators can sign in with an elevated role that grants cross-funeral-home read access and administrative controls.
- FR5 [Growth] Funeral-home admins can invite additional users into their funeral home and assign each invitee one of the defined in-home roles (Admin, Ordering, Accounts).
- FR6 [Growth] Chain-accounts users can sign in and see a consolidated view spanning every funeral home in their chain.
- FR7 [MVP] The portal logs every sign-in event with user identity, funeral-home context, and timestamp.

**Funeral-Home Onboarding (Connect Custom)**

- FR58 [MVP] Legacy ops can initiate Stripe Connect Custom account creation for a new funeral home, providing at minimum legal name, primary contact email, and country.
- FR59 [MVP] The portal generates a Stripe-hosted account-link URL and dispatches it to the primary contact via the existing Legacy.com mail sender with a short branded onboarding message.
- FR60 [MVP] Funeral-home admins can complete Connect KYB via Stripe-hosted onboarding (business details, beneficial-owner information, tax identifier, bank linkage via Financial Connections) — without any KYB data transiting Legacy.com infrastructure.
- FR61 [MVP] The portal displays the funeral home's current Connect account state (pending / needs-info / restricted / enabled) on both funeral-home-facing dashboards and Legacy-ops admin views, with a human-readable description of what each state requires of the user.
- FR62 [MVP] The portal surfaces unmet Connect requirements on the funeral-home's dashboard with an actionable control that generates a fresh hosted account-link to resume KYB.
- FR63 [MVP] The portal idempotently processes `account.updated` webhooks from Stripe, updating the cached Connect account state and emitting ops alerts on configured transitions.
- FR64 [MVP] Legacy ops can open the Stripe Dashboard for any funeral home's Connected Account via a deep-link from the portal's funeral-home detail view.
- FR65 [MVP] Legacy ops can resend an account-link to any funeral home whose Connect account is not yet in the `enabled` state, generating a fresh hosted URL each time.

**Listings Lifecycle**

- FR8 [MVP] Funeral-home users can create an obituary listing by entering deceased name, dates, obituary text, one or more newspaper selections, and a publication date.
- FR9 [MVP] The portal surfaces per-newspaper pricing to the user at listing-creation time, computed from the newspapers and options chosen.
- FR10 [MVP] The portal distinguishes between newspapers Legacy invoices on behalf of (billing-partner) and newspapers the funeral home is invoiced for directly.
- FR11 [MVP] Funeral-home users can save a listing as a draft before submitting.
- FR12 [MVP] Funeral-home users can edit a listing while in draft, pending, or upcoming status.
- FR13 [MVP] Funeral-home users can view full detail of any listing associated with their funeral home, including its current status and price.
- FR14 [MVP] The portal maintains a listing status lifecycle of draft → pending → upcoming → published.
- FR15 [Growth] Funeral-home users can place orders through a multi-step guided wizard with step-wise validation and back-navigation state preservation.
- FR16 [Growth] Funeral-home users can add priced upsells (photo, candle, online memorial) during order placement.
- FR17 [Growth] Funeral-home users can cancel a listing prior to publication and receive a credit note or refund.

**Billing and Invoicing**

- FR18 [MVP] For approved funeral homes, the portal aggregates a calendar month's listings into a single monthly invoice identified as `INV-YYYY-MM`.
- FR19 [MVP] Funeral-home users can view every monthly invoice associated with their funeral home, including status, due date, total due, total paid, and comprising listings.
- FR20 [MVP] Funeral-home users can finalise and pay a monthly invoice via a Stripe-hosted payment surface, without card data transiting Legacy.com infrastructure.
- FR21 [MVP] Funeral-home users can download a PDF of any finalised or paid monthly invoice.
- FR22 [MVP] Funeral-home users can download a bundled zip archive of every finalised monthly invoice PDF with a summary index.
- FR23 [MVP] For pre-pay (non-approved) funeral homes, the portal creates a per-listing Stripe invoice immediately on submission and presents the hosted payment surface before the listing publishes.
- FR24 [MVP] The portal receives, verifies the signature of, and idempotently processes Stripe webhooks for `invoice.finalized`, `invoice.paid`, and `invoice.payment_failed`.
- FR25 [MVP] On `invoice.paid`, the portal transitions every listing associated with the invoice to published status.
- FR26 [MVP] Funeral-home users can select multiple unpaid invoices in a cart and initiate payment across them in a single session.
- FR27 [Growth] For approved funeral homes with a card on file, the portal auto-advances the monthly invoice on its due date, charging the saved card.
- FR28 [Growth] For pre-pay funeral homes, the portal presents an embedded Stripe Payment Element at order submit.
- FR29 [Growth] The portal triggers configurable dunning communications when a monthly invoice passes its due date.
- FR30 [Growth] Chain-accounts users can export a consolidated CSV of listings and invoices across every funeral home in the chain, filtered by date range.

**Loyalty**

- FR31 [MVP] The portal accrues loyalty points to a funeral home when a listing reaches a final successful billing state (invoice paid for approved; listing published after pre-pay). Never on listing creation alone.
- FR32 [MVP] Funeral-home users can view their current loyalty points balance and tier name at any time.
- FR33 [MVP] Funeral-home users can view a chronological history of loyalty earning and redemption events.
- FR34 [MVP] Funeral-home users can redeem loyalty points for a digital reward backed by Stripe Issuing (virtual card on the FH's Connected Account; cardholder = FH legal entity) or Tremendous, selectable at configuration.
- FR35 [MVP] On successful redemption, the portal presents the redeemed card details (number, expiry, security code) via Stripe ephemeral keys, without persisting those details in Legacy.com storage.
- FR36 [MVP] Funeral-home users can view a list of previously redeemed cards and their remaining balances, fetched from the issuing backend.
- FR37 [Growth] The portal presents a visible tier (Bronze / Silver / Gold) and progress-to-next-tier indicator.
- FR38 [Growth] Funeral-home users can redeem loyalty points for account credit applied to their next monthly invoice, or (at Gold tier) a CPD voucher.
- FR39 [Growth] The portal emits notifications when a funeral home crosses a tier threshold or redemption threshold.

**Account Management**

- FR40 [MVP] Funeral-home users can see their billing-status tier (approved or pre-pay) prominently on the dashboard and in account-detail views.
- FR41 [MVP] When a funeral home is in a frozen state *or* its Connect account is not in `enabled` state, the portal prevents the creation or submission of new listings and surfaces an explanatory message with an actionable path to resolution.
- FR42 [Growth] Pre-pay funeral homes can see a progress indicator toward approved-account eligibility and initiate an underwriting-review request. Because KYB and bank linkage were completed at Connect onboarding, this is a billing-status review — not a new bank-verification flow.

**Internal Operations**

- FR43 [MVP] Legacy internal operators can view a read-only roll-up of service-fee / commission owed per billing-partner newspaper, with a per-listing breakdown.
- FR44 [MVP] Legacy internal operators can freeze and unfreeze a funeral home's account, with the action recorded in an append-only audit record.
- FR45 [MVP] Legacy internal operators can view the queue of monthly invoices that are currently overdue across the network.
- FR46 [MVP] In non-production environments only, Legacy internal operators can enable a simulated-error toggle that causes downstream payment flows to return a synthetic failure.
- FR47 [Growth] Legacy internal operators can configure the dunning cadence for overdue monthly invoices.

**Notifications**

- FR48 [MVP] The portal sends a transactional email confirmation to the funeral home on listing submission and on invoice status transitions, using the existing Legacy.com mail sender.
- FR49 [Growth] Funeral-home users can see an in-portal notification centre listing recent account, billing, and loyalty events with deep links.
- FR50 [Growth] The portal sends branded email notifications for a defined event set (invoice issued, payment failed, redemption succeeded, tier milestone reached), with a preference centre for opt-outs.

**Order Adjustments**

- FR51 [Growth] When the price of an in-flight listing changes after submission, the portal notifies the funeral home in-app and (if enabled) by email, surfacing before-and-after amounts and the reason.
- FR52 [Growth] Funeral-home users can approve or dispute a price adjustment, with approve producing a matching Stripe invoice-line-item correction or credit note.
- FR53 [Growth] Funeral-home users can view the full adjustment history of a listing, including who changed what, when, and why.

**Audit and Compliance**

- FR54 [MVP] The portal records every loyalty accrual, redemption, card issuance, card status change, freeze, unfreeze, and administrative override to an append-only audit store keyed by user, object, and timestamp.
- FR55 [MVP] The portal captures a deterministic idempotency key on every outbound Stripe mutation (invoice, invoice-item, credit-note, cardholder, card) derived from the originating business operation.
- FR56 [MVP] The portal records every inbound Stripe webhook event with its Stripe event id, type, signature-verification result, received-at, processed-at, and processing outcome, and short-circuits duplicate delivery using persistent state.
- FR57 [MVP] Every money-affecting record is reproducible from Legacy.com persistence joined to its Stripe object id for a minimum seven-year retention window.

### NonFunctional Requirements

**Performance**

- NFR1 p95 dashboard page load ≤ 1.5s on business-broadband desktop, measured from request initiation to First Contentful Paint.
- NFR2 p95 listing-submit round-trip ≤ 2s from submit click to server-confirmed persistence.
- NFR3 p95 invoice-list fetch ≤ 1s for a funeral home with up to 24 months of history.
- NFR4 p95 loyalty-redemption round-trip ≤ 3s from confirm click to card details displayed (includes Stripe Issuing / Tremendous round-trip).
- NFR5 p99 Stripe webhook processing ≤ 5s from receipt — ingest, signature verify, idempotent apply, persist.

**Security**

- NFR6 No card PAN, expiry, or CVV is ever captured, transmitted, or stored by Legacy.com infrastructure. Verified by quarterly Snyk + Stripe configuration audit and penetration test.
- NFR7 All user-facing endpoints require an authenticated session; unauthenticated requests return HTTP 401 with no data disclosure.
- NFR8 Every user-facing endpoint enforces role and tenant checks server-side; repository-level queries are tenant-scoped by default.
- NFR9 All Stripe webhook inbound requests verify signature; failures return HTTP 400, emit an alert, and are never silently treated as success.
- NFR10 Every outbound Stripe mutation passes a deterministic idempotency key derived from the originating business operation.
- NFR11 Secrets are loaded from existing Legacy.com secrets management; no secret appears in source control, log output, or error messages.
- NFR12 Snyk SAST passes with zero critical / zero high unresolved at any release; release is blocked until resolved or risk-accepted.

**Accessibility**

- NFR13 All funeral-home-facing screens conform to WCAG 2.1 AA.
- NFR14 The portal is usable end-to-end without a mouse — every interactive control is keyboard-reachable with visible focus indicators.
- NFR15 Every non-decorative image has meaningful alternative text; every form input has a label or aria-label.
- NFR16 Automated accessibility scan (axe-core or platform equivalent) executes on every PR and blocks release on new critical violations.

**Reliability and Availability**

- NFR17 Portal module availability target 99.5% monthly, inherited from or exceeded by the existing Legacy.com platform SLO.
- NFR18 The portal tolerates AWS EC2 primary→failover transition without data loss; in-flight sessions re-authenticate via existing platform session behaviour.
- NFR19 Stripe webhook processing is resilient to duplicate and out-of-order delivery; replaying any previously-processed event id produces no duplicate side effect.
- NFR20 Persistent Stripe-event state allows recovery from any process restart with no lost events and no reprocessed events.

**Integration**

- NFR21 Stripe SDK version is pinned and upgraded on a quarterly review cadence; Stripe API version is pinned explicitly on the Stripe account, not floated to latest.
- NFR22 Tremendous fallback is feature-complete at MVP go-live and switchable between Stripe Issuing and Tremendous by configuration change, without source-code release.
- NFR23 Outbound email uses the existing Legacy.com mail sender; no new SMTP infrastructure, no new deliverability reputation.

**Usability**

- NFR24 The portal is usable by a first-time user with no training for the Diane persona journey. Validated via moderated usability session on a sample of FH users prior to customer pilot.
- NFR25 Error states surfaced to users describe cause and resolution in plain English; technical stack traces and raw Stripe error codes are never shown in the UI.

**Observability**

- NFR26 Every Stripe webhook event handled emits a structured log entry containing event id, event type, signature-verification outcome, processing outcome, and correlation id — consistent with existing Legacy.com logging conventions.
- NFR27 Every user-facing 5xx produces a log entry with user id, funeral-home context, endpoint, and correlation id; fatal errors trigger alerting via existing Legacy.com alerting infrastructure.

### Additional Requirements

Extracted from architecture decisions (D1–D37), implementation patterns, project structure, and validation gaps in `planning/architecture.md`. Each informs at least one story.

**Module bootstrap / platform-convention validation (Sprint-1 prerequisite)**

- AR-BOOT-1 [MVP] Module package scaffold created at `com.legacy.obituaries.*` inside the existing Legacy.com Spring Boot monolith, with submodule packages `onboarding / listings / billing / loyalty / cards / admin / audit / stripe / notifications / common`.
- AR-BOOT-2 [MVP] Stripe Java SDK dependency added to the platform's existing build file, pinned to the version matching the Stripe API version fixed on the Legacy platform Stripe account.
- AR-BOOT-3 [MVP] Platform-convention validation task completed: layering convention, build file, migration tool, JSP root, static-asset root, test root, DB GRANT boundary, money-column convention, platform mail sender, platform feature-flag mechanism, platform secrets management, `@Scheduled`/scheduler capability, platform availability SLO documented in a short validation report.
- AR-BOOT-4 [MVP] Stripe Connect platform agreement + Services Agreement presentation flow confirmed live (commercial / legal prerequisite) before any Connect code runs in production.

**Foundational infrastructure (before any feature story)**

- AR-FND-1 [MVP] Correlation-id Servlet filter mints a correlation id per request, stores it in MDC, echoes to response header, and includes it on every outbound Stripe call's `metadata` (D20).
- AR-FND-2 [MVP] Single `StripeClient` Spring bean configured with pinned API version at startup from per-env secrets (D23, D34). CI blocks deploys that wire non-prod secrets to live keys.
- AR-FND-3 [MVP] `ConnectedAccountStripeClient` wrapper auto-sets the `Stripe-Account` header when acting on a Connected Account (D37).
- AR-FND-4 [MVP] `POST /webhooks/stripe` endpoint with: raw-body-preserving filter, Stripe SDK signature verification, HTTP 400 + alert on signature failure, PK-collision short-circuit against `obituaries_stripe_webhook_event` (D6, D14, D31).
- AR-FND-5 [MVP] `StripeEventRouter` dispatches by `event.type` to `StripeEventHandler` implementations; unknown types fail (never silent 200). Handler signature surfaces `event.account` for Connected-Account context (Critical Gap 1).
- AR-FND-6 [MVP] Append-only `obituaries_audit_event` table; `AuditService` write-only API; DB-level `REVOKE UPDATE, DELETE` on the app user (if DB GRANT boundary available) + Hibernate `@Immutable` + no mutation method on the repository (D8).
- AR-FND-7 [MVP] `FhScopedRepository<T>` base interface with Hibernate `@Filter` / `@FilterDef` + `TenantFilterInterceptor` auto-enablement at Hibernate session open from session-resolved FH id (D3). `OpsRepository<T>` for cross-tenant methods named with `AcrossTenants` suffix.
- AR-FND-8 [MVP] `@ControllerAdvice` `GlobalExceptionHandler` maps exceptions to uniform `{ error: { code, message, correlationId } }` JSON envelope for AJAX and styled error page for full-page errors. Reserved error codes enumerated in `ErrorCode` (D19).
- AR-FND-9 [MVP] Structured logging schema for Stripe events: `{ correlationId, stripeEventId, stripeEventType, tenantId, signatureVerified, processingResult, errorCode }` (D35).
- AR-FND-10 [MVP] `FeatureFlagService.isEnabled(key)` as single feature-gate API; inherit platform's feature-flag mechanism if present, else config-driven boolean backed by `feature_flag` table or properties (D36).

**Data model (Sprint-1 → Sprint-2)**

- AR-DATA-1 [MVP] Money columns: `amount_cents BIGINT NOT NULL` + `currency_code CHAR(3) NOT NULL DEFAULT 'USD'` on every money-bearing row. Inherit platform convention if stricter. Single `Money.formatUsd(long cents)` helper and `<obituaries:money>` JSTL tag (D2).
- AR-DATA-2 [MVP] `obituaries_stripe_connect_account` cache table: `funeral_home_id FK PK, stripe_account_id, state ENUM, requirements_due_json, last_updated_at, last_event_id` (D9).
- AR-DATA-3 [MVP] Extend existing Legacy.com `funeral_home` table with `stripe_connect_account_id` + `billing_status_tier` columns via a migration (Critical Gap 4 resolution; fallback: module-owned table FK-linked if platform policy forbids foreign-module columns).
- AR-DATA-4 [MVP] Deterministic outbound idempotency-key helpers (`IdempotencyKeys.forListingInvoiceItem(id)`, `.forInvoiceFinalize(id)`, `.forCardholder(fhId)`, `.forRedemption(redemptionId)`) — never `UUID.randomUUID()` at call site (D7).
- AR-DATA-5 [MVP] State-machine persistence: state enum on entity + named service methods for transitions + `state_transition` audit row on every write (D11). State machines: listing lifecycle, invoice state, Connect account state, billing-status tier.
- AR-DATA-6 [MVP] All Stripe object ids persisted in native form (`stripe_customer_id`, `stripe_invoice_id`, `stripe_account_id`, `stripe_event_id`) on their owning entities for seven-year audit join (FR57).

**Stripe integration contract**

- AR-STRIPE-1 [MVP] Charge pattern: **direct charges on the Connected Account**, with the FH as the Stripe Customer; Legacy takes an application fee for billing-partner listings (Critical Gap 3 resolution).
- AR-STRIPE-2 [MVP] Daily `@Scheduled` Connect-state reconciliation job pulling active Connected Accounts from Stripe API and alerting ops on cache divergence (Critical Gap 2 resolution).
- AR-STRIPE-3 [MVP] `MonthlyCloseScheduler` pinned to `America/New_York` (`@Scheduled(cron = "0 0 1 1 * *", zone = "America/New_York")`) — month-boundary determinism for `INV-YYYY-MM` identifiers (Important Gap 5).
- AR-STRIPE-4 [MVP] Webhook handler concurrency rule: on PK collision, return 200 unconditionally; do not read `processed_at` (may still be pending on the other replica) (Important Gap 6).

**CI / testing / release**

- AR-CI-1 [MVP] ArchUnit / Checkstyle rules added: package-boundary enforcement; no raw `Stripe.apiKey` outside `stripe` package; no native-query methods without `fhId` on FH-scoped repositories; no `setStatus` calls outside the owning service.
- AR-CI-2 [MVP] Playwright E2E harness wired to hero-journey specs `journey0-onboarding` through `journey5-priya-ops` under `e2e/obituaries/`, running green on every PR in Jenkins.
- AR-CI-3 [MVP] Snyk SAST release gate enforced (zero critical / zero high unresolved).
- AR-CI-4 [MVP] axe-core (or platform equivalent) accessibility scan on every PR; blocks release on new critical violations.

**CCPA / compliance**

- AR-COMP-1 [MVP] DSAR support: export path (query `obituaries_audit_event` + read platform user record); delete path (redact name/email in `audit_event` via one named admin operation on `OpsRepository` preserving append-only invariant for the rest of the row) (Important Gap 7).

### UX Design Requirements

No dedicated UX design document is in scope. The following UX-adjacent requirements are lifted from PRD §SaaS B2B Specific Requirements → Desktop-First + §Non-Functional Requirements → Accessibility, and should inform UI stories:

- UX-DR1 [MVP] Desktop-first layouts at ≥1280px primary; responsive behaviour down to 1024px minimum window width; no active breakage at phone widths (no horizontal scroll or unreachable controls) but no mobile-portrait optimisation.
- UX-DR2 [MVP] Keyboard-first interactions with visible focus indicators on every interactive control (NFR14).
- UX-DR3 [MVP] Plain-English error messages surfaced to users; technical stack traces and raw Stripe error codes never shown in the UI (NFR25).
- UX-DR4 [MVP] Clear status visibility on the dashboard for the three always-current data points: current balance, upcoming invoice, loyalty points balance (PRD §Executive Summary pillar 3).
- UX-DR5 [MVP] In-context actionable messaging when a funeral home is frozen or its Connect account is not yet `enabled` (FR41) — banner + CTA, never a silent disabled state.
- UX-DR6 [MVP] Hosted-Stripe surfaces (hosted invoice, Issuing card reveal via ephemeral keys) render in-context with clear return-to-portal breadcrumbs.
- UX-DR7 [MVP] Color-contrast and typography meet WCAG 2.1 AA (NFR13); audience skews 50+, so clear typography and high contrast matter regardless of form factor.
- UX-DR8 [MVP] Every non-decorative image has alt text; every form input has an associated label or aria-label (NFR15).

### FR Coverage Map

**MVP**

- FR1 → Epic 1 — Funeral-home sign-in via existing Legacy.com session
- FR2 → Epic 1 — Resolve FH identity from session
- FR3 → Epic 1 — Tenant-scoped queries (repository-layer enforcement)
- FR4 → Epic 1 — Legacy ops elevated role with cross-FH access
- FR7 → Epic 1 — Sign-in event logging
- FR8 → Epic 2 — Create obituary listing (single form)
- FR9 → Epic 2 — Per-newspaper pricing at listing creation
- FR10 → Epic 2 — Billing-partner vs direct-invoice routing
- FR11 → Epic 2 — Save listing as draft
- FR12 → Epic 2 — Edit draft / pending / upcoming listing
- FR13 → Epic 2 — View listing detail with status + price
- FR14 → Epic 2 — Listing status lifecycle (draft → pending → upcoming → published)
- FR18 → Epic 3 — Monthly invoice aggregation with `INV-YYYY-MM` id
- FR19 → Epic 3 — View monthly invoices with status / due / total / listings
- FR20 → Epic 3 — Finalise + pay monthly invoice via Stripe-hosted surface
- FR21 → Epic 3 — Download invoice PDF
- FR22 → Epic 3 — Bulk zip of invoice PDFs + summary index
- FR23 → Epic 2 — Pre-pay per-listing Stripe invoice on submission
- FR24 → Epic 3 — Inbound `invoice.finalized` / `invoice.paid` / `invoice.payment_failed` webhooks
- FR25 → Epic 3 — Listings auto-publish on `invoice.paid`
- FR26 → Epic 3 — Multi-invoice cart drawer
- FR31 → Epic 4 — Accrue loyalty points on successful billing state (never on placement)
- FR32 → Epic 4 — View balance + tier name
- FR33 → Epic 4 — View earning + redemption history
- FR34 → Epic 4 — Redeem via Stripe Issuing or Tremendous (selectable at config)
- FR35 → Epic 4 — Ephemeral-keys card reveal
- FR36 → Epic 4 — My Cards list with remaining balances
- FR40 → Epic 3 — Billing-status tier visible on dashboard + account detail
- FR41 → Epic 2 (Connect-state half) + Epic 5 (freeze half) — Gating on non-`enabled` or frozen state
- FR43 → Epic 6 — Service Fees roll-up per billing-partner
- FR44 → Epic 5 — Freeze / unfreeze with audit
- FR45 → Epic 6 — Overdue invoice queue
- FR46 → Epic 6 — Simulated-error toggle (non-prod only)
- FR48 → Epic 3 (primary) + Epic 2 (uses facility) — Transactional email on listing submit + invoice state transitions
- FR54 → Epic 1 — Append-only audit trail
- FR55 → Epic 1 — Deterministic outbound idempotency keys
- FR56 → Epic 1 — Persistent inbound webhook idempotency
- FR57 → Epic 1 — 7-year retention; reproducible from Stripe object ids
- FR58 → Epic 1 — Initiate Connect Custom account creation
- FR59 → Epic 1 — Generate + email hosted account-link
- FR60 → Epic 1 — Hosted KYB completion (Stripe-owned surface)
- FR61 → Epic 1 — Display Connect state on FH + ops views
- FR62 → Epic 1 — Requirements-due banner with resume-link action
- FR63 → Epic 1 — `account.updated` webhook idempotent processing
- FR64 → Epic 1 — Stripe Dashboard deep-link per FH
- FR65 → Epic 1 — Resend account-link (ops action)

**Growth**

- FR5 → Epic 9 — FH admins invite users + assign roles
- FR6 → Epic 9 — Chain-accounts consolidated view
- FR15 → Epic 7 — Multi-step order wizard with back-navigation state
- FR16 → Epic 7 — Priced upsells during order placement
- FR17 → Epic 7 — Cancel listing with credit note / refund
- FR27 → Epic 8 — Auto-advance charge on card-on-file
- FR28 → Epic 8 — Embedded Stripe Payment Element for pre-pay
- FR29 → Epic 8 — Configurable dunning cadence
- FR30 → Epic 9 — Chain-wide consolidated CSV export
- FR37 → Epic 10 — Visible Bronze / Silver / Gold tier + progress bar
- FR38 → Epic 10 — Account credit + Gold-tier CPD redemption
- FR39 → Epic 10 — Tier-crossing / redemption-threshold notifications
- FR42 → Epic 8 — Pre-pay → approved upgrade pathway (billing-status review)
- FR47 → Epic 8 — Dunning cadence configuration console
- FR49 → Epic 11 — In-portal notification centre with deep links
- FR50 → Epic 11 — Branded email notifications with preference centre
- FR51 → Epic 12 — Price-change notification with before/after + reason
- FR52 → Epic 12 — Approve / dispute adjustment producing Stripe line-item correction or credit note
- FR53 → Epic 12 — Full adjustment history per listing

**Unique FR totals:** MVP = 46 (FR41, FR48 span two epics each — primary owner counted once). Growth = 19. Grand total = 65 ✓

## Epic List

### Epic 1: Funeral-Home Onboarding (Connect Custom)

A new funeral home becomes a first-class Stripe Connected Account with verified KYB, visible in both the portal and Stripe Dashboard. Legacy ops can onboard, monitor, and resume stalled KYB. Also delivers the module's foundational cross-cutting infrastructure (correlation id, Stripe client, webhook endpoint, persistent idempotency, append-only audit, tenancy filter, error envelope, feature-flag service) since every subsequent epic depends on it.

**User outcome (Journey 0 — Carter & Sons onboarded by Priya):** Legacy ops initiates onboarding → Stripe-hosted KYB completes → `account.updated` webhook flips cache to `enabled` → funeral home signs in, dashboard loads, ready to transact.

**FRs covered:** FR1, FR2, FR3, FR4, FR7, FR54, FR55, FR56, FR57, FR58, FR59, FR60, FR61, FR62, FR63, FR64, FR65

**Key ARs / NFRs woven in:** AR-BOOT-1 to -4 (module bootstrap + platform-convention validation + Stripe Connect platform-agreement prerequisite); AR-FND-1 to -10 (correlation id, StripeClient, ConnectedAccountStripeClient, webhook endpoint + signature + idempotency, event router, audit store, tenancy filter, error envelope, structured logs, feature-flag service); AR-DATA-2 (Connect-state cache), AR-DATA-3 (FH table extension), AR-DATA-4 (idempotency-key helpers); AR-STRIPE-1 (direct-charge pattern), AR-STRIPE-2 (Connect reconciliation job); AR-CI-1 (ArchUnit / Checkstyle rules); AR-COMP-1 (DSAR surface). Satisfies NFR6, NFR7, NFR8, NFR9, NFR10, NFR11, NFR17, NFR18, NFR19, NFR20, NFR21, NFR26, NFR27.

**Blocks:** Every subsequent epic.

### Epic 2: Listings & Pre-Pay Invoicing

An onboarded funeral home can create obituary listings, see per-newspaper pricing, and — if the FH is pre-pay — pay via Stripe-hosted invoice before the listing publishes.

**User outcome (Journey 1 listing creation + Journey 4 MVP pre-pay slice):** Diane (approved) creates a listing in a single form, sees $295 + 125 loyalty-points confirmation. Sam (pre-pay) submits → Stripe-hosted invoice opens → he pays → listing publishes. Connect-state check gates either flow if the FH isn't `enabled`.

**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR23, FR41 (Connect-state half of gating)

**Key ARs / NFRs woven in:** AR-DATA-5 (listing state machine); UX-DR1 (desktop-first), UX-DR2 (keyboard-first), UX-DR4 (dashboard status visibility), UX-DR5 (in-context gating messaging). Satisfies NFR1, NFR2, NFR13, NFR14, NFR15, NFR16, NFR24, NFR25.

**Depends on:** Epic 1.

### Epic 3: Monthly Aggregation & Approved Billing

An approved funeral home sees its listings aggregate into a single monthly invoice, pays via Stripe-hosted page, downloads PDFs (single or bundled zip), and watches listings auto-publish when the invoice is marked paid. Multi-invoice cart drawer lets them pay several at once.

**User outcome (Journey 1 billing half + Journey 3 single-home slice):** End-of-month Stripe invoice email arrives → hosted-page payment → `invoice.paid` webhook → Invoices tab status flips live + listings auto-publish. Bulk PDF export zip available any time.

**FRs covered:** FR18, FR19, FR20, FR21, FR22, FR24, FR25, FR26, FR40, FR48

**Key ARs / NFRs woven in:** AR-STRIPE-3 (MonthlyCloseScheduler pinned to America/New_York); AR-STRIPE-4 (webhook replica-concurrency rule). Satisfies NFR3, NFR5, NFR19, NFR20, NFR23, NFR26.

**Depends on:** Epic 1, Epic 2.

### Epic 4: Loyalty Earning & Redemption

A funeral home accrues loyalty points on successful billing state (invoice paid for approved accounts; listing published post-payment for pre-pay), sees points history, and redeems points for an Issuing virtual card on its own Connected Account (or a Tremendous fallback) revealed in-browser via Stripe ephemeral keys.

**User outcome (Journey 1 climax):** Diane reaches 10,000 points → Loyalty tab → Redeem → instant Stripe Issuing virtual card number/exp/CVV revealed via ephemeral keys → she buys a printer that evening.

**FRs covered:** FR31, FR32, FR33, FR34, FR35, FR36

**Key ARs / NFRs woven in:** AR-STRIPE-1 (Issuing on Connected Account); FulfilmentStrategy pattern (NFR22 Tremendous fallback config-switchable); UX-DR6 (Stripe.js card reveal with return-to-portal breadcrumbs). Satisfies NFR4, NFR6, NFR10.

**Depends on:** Epic 3 (accrual hook fires from `invoice.paid` handler).

### Epic 5: Billing Exception Handling

When an `invoice.payment_failed` arrives or a funeral home is overdue, the portal shows a clear explanation, gates new-listing / redemption actions with an in-context banner, and lets Legacy ops freeze / unfreeze with audit.

**User outcome (Journey 2 — Diane's missed-payment recovery):** Auto-charge attempt fails (Stripe webhook) → portal marks overdue → ops reviews, freezes her account → Diane next visits, banner explains + CTA goes to hosted payment page → she pays by different card → `invoice.paid` publishes listings → ops unfreezes → she's ordering again within minutes.

**FRs covered:** FR41 (frozen half of gating), FR44 (+ exercises FR24 `invoice.payment_failed` branch established in Epic 3)

**Key ARs / NFRs woven in:** UX-DR5 (in-context messaging); AuditService integration for freeze / unfreeze (FR54).

**Depends on:** Epic 3.

### Epic 6: Internal Operations Console

Legacy ops gets a dedicated admin surface: read-only Service Fees roll-up per billing-partner newspaper, overdue-invoice queue across the network, simulated-error toggle (non-prod only) for demo / QA, and a Stripe Dashboard deep-link per FH for advanced investigation.

**User outcome (Journey 5 — Priya watches the billing stream):** Priya opens Service Fees for the month → spots overdue FH → opens detail → calls them → freezes (via Epic 5's control) → next day uses Stripe Dashboard deep-link for an ambiguous charge → issues credit note in Stripe → sees it reflected in the portal.

**FRs covered:** FR43, FR45, FR46 (Stripe Dashboard deep-link FR64 lives in Epic 1 as part of ops onboarding views).

**Depends on:** Epic 3, Epic 5.

---

### Epic 7: Order Wizard & Upsells *(Growth)*

Funeral-home users place orders through a multi-step guided wizard with step-wise validation, state preservation on back-navigation, and priced upsells (photo / candle / online memorial). Can cancel pre-publication with an automatic credit note or refund.

**FRs covered:** FR15, FR16, FR17

**Depends on:** MVP Epic 2 (replaces single form with wizard).

### Epic 8: Automated Billing *(Growth)*

Approved FHs get auto-advance card-on-file charging + automated dunning + self-service unfreeze. Pre-pay FHs get the embedded Stripe Payment Element at order submit + a visible progress-to-approved pathway with underwriting-review request flow. Ops gets a dunning console to configure reminder cadences.

**FRs covered:** FR27, FR28, FR29, FR42, FR47

**Depends on:** MVP Epic 3, Epic 5.

### Epic 9: Multi-User RBAC & Chain Accounts *(Growth)*

FH admins invite additional users and assign roles (Admin / Ordering / Accounts). Chain-accounts users sign in to a consolidated roll-up spanning all FHs in their chain, with a chain-wide CSV export filterable by date range.

**FRs covered:** FR5, FR6, FR30

**Depends on:** MVP Epic 1 (tenancy foundation).

### Epic 10: Loyalty Tier Experience *(Growth)*

Visible Bronze / Silver / Gold tier with progress-to-next-tier bar. Account-credit redemption at all tiers; Gold-tier CPD voucher redemption. Notifications on tier crossings and redemption thresholds.

**FRs covered:** FR37, FR38, FR39

**Depends on:** MVP Epic 4.

### Epic 11: Notifications Centre & Preferences *(Growth)*

In-portal notification centre listing recent account / billing / loyalty events with deep links. Branded email notifications for a defined event set (invoice issued, payment failed, redemption succeeded, tier milestone reached), with a preference centre for opt-outs.

**FRs covered:** FR49, FR50

**Depends on:** MVP Epic 3 (email facility established).

### Epic 12: Order Adjustment Flow *(Growth)*

When a listing's price changes post-submission (word-count change, newspaper price change), the FH sees before / after + reason in-app and (if enabled) by email. Can approve (producing matching Stripe invoice-line-item correction or credit note) or dispute. Full adjustment history visible per listing, keyed by who / when / why.

**FRs covered:** FR51, FR52, FR53

**Depends on:** MVP Epic 2, Epic 3.

---

**Growth ordering is flexible** — delivered in any sequence post-MVP, driven by pilot feedback. Typical request order: Epic 7 (wizard) → Epic 8 (automation) → Epic 9 (RBAC / chain) → Epic 10 (tier visuals) → Epic 12 (adjustments) → Epic 11 (notifications centre).

## Epic-Level Cross-Cutting Acceptance Criteria

These apply to every story unless explicitly overridden:

- **All AJAX endpoints** return `{ data: {...}, meta: { correlationId } }` on success or `{ error: { code, message, correlationId } }` on failure (D19).
- **All FH-scoped queries** are tenant-filtered at the repository layer (D3); cross-tenant reads fail with `TENANT_FORBIDDEN`.
- **All state-change service methods** write an `audit_event` row as the last action before commit; audit write failure rolls back the whole transaction (D8).
- **All outbound Stripe mutations** pass a business-derived idempotency key via `RequestOptions.setIdempotencyKey(...)`; calls against Connected Accounts additionally carry `RequestOptions.setStripeAccount(connectAccountId)` via `ConnectedAccountStripeClient` (D7, D37).
- **All inbound Stripe webhooks** are signature-verified; duplicate `stripe_event_id` short-circuits with HTTP 200 (D6, D14).
- **All user-visible errors** are plain English; raw Stripe error codes and stack traces never shown (NFR25).
- **All pages** conform to WCAG 2.1 AA; keyboard-operable with visible focus indicators (NFR13–NFR14).

## Epic 1: Funeral-Home Onboarding (Connect Custom)

Module foundation + Journey 0. First eight stories are Sprint-1 foundation prerequisites that every other epic depends on.

### Story 1.1: Module scaffold, SDK pin, and platform-convention validation report

As an engineering lead,
I want the Obituaries Portal module scaffolded inside the existing Legacy.com monolith with a written platform-convention validation report,
So that every subsequent story has confirmed places to put code and confirmed platform capabilities to consume.

**Acceptance Criteria:**

**Given** a clean check-out of the Legacy.com codebase
**When** this story is complete
**Then** the module package tree exists at `com.legacy.obituaries.{onboarding|listings|billing|loyalty|cards|admin|audit|stripe|notifications|common}`
**And** the Stripe Java SDK dependency is added to the platform's build file, pinned to a version matching the Stripe API version fixed on the platform Stripe account
**And** `planning/epics/platform-convention-report.md` documents: build tool + version, layering convention, JSP root, static-asset root, test root, migration tool, money-column convention, mail sender availability, feature-flag mechanism availability, secrets management, scheduler availability, DB GRANT boundary, platform availability SLO
**And** the Stripe Connect platform agreement + Services Agreement presentation flow are confirmed live in writing from Commercial/Legal (AR-BOOT-4)

### Story 1.2: Correlation-id filter, structured log schema, and uniform error envelope

As an ops engineer,
I want every request tagged with a correlation id and every 5xx surfaced with a uniform error envelope,
So that I can trace a user complaint through logs and Stripe events in seconds.

**Acceptance Criteria:**

**Given** any HTTP request to the module
**When** the request enters the Servlet container
**Then** a `CorrelationIdFilter` mints a UUID, stores it in MDC, echoes it on the response header, and includes it in every log line for that request
**And** any uncaught exception is mapped by `@ControllerAdvice` `GlobalExceptionHandler` to `{ error: { code, message, correlationId } }` for AJAX or a styled error page for full-page renders
**And** the reserved error codes (`VALIDATION_FAILED`, `TENANT_FORBIDDEN`, `CONNECT_NOT_ENABLED`, `INVALID_STATE_TRANSITION`, `STRIPE_UPSTREAM_ERROR`, `FEATURE_DISABLED`, `NOT_FOUND`, `UNAUTHENTICATED`, `INTERNAL_ERROR`) are enumerated in an `ErrorCode` enum
**And** 5xx errors emit a log entry at ERROR level with user id, tenant id, endpoint, and correlation id (NFR27)

### Story 1.3: Stripe client beans and outbound idempotency-key helpers

As a dev agent,
I want a single `StripeClient` bean, a `ConnectedAccountStripeClient` wrapper, and an `IdempotencyKeys` helper,
So that every outbound Stripe call is configured identically with no drift.

**Acceptance Criteria:**

**Given** module startup
**When** Spring wires beans
**Then** exactly one `StripeClient` bean exists, configured with the pinned API version and env-specific keys from platform secrets
**And** a startup check fails fast if any non-prod environment has live keys configured (D34)
**And** `ConnectedAccountStripeClient` wraps the client so every call auto-sets `RequestOptions.setStripeAccount(connectAccountId)`
**And** `IdempotencyKeys` exposes `forConnectAccountCreate(legacyFhId)`, `forListingInvoiceItem(listingId)`, `forInvoiceFinalize(invoiceId)`, `forCardholder(fhId)`, `forRedemption(redemptionId)`
**And** the charge pattern is set to **direct charges on the Connected Account** with the FH as Stripe Customer, Legacy taking an application fee for billing-partner listings (AR-STRIPE-1)

### Story 1.4: Webhook endpoint with signature verification and persistent idempotency

As an ops engineer,
I want `POST /webhooks/stripe` to verify every event signature, short-circuit duplicates, and route by type to explicit handlers,
So that Stripe's at-least-once delivery never causes duplicate side effects and no event type is ever silently accepted.

**Acceptance Criteria:**

**Given** a Stripe webhook request
**When** the request arrives at `/webhooks/stripe`
**Then** a filter preserves the raw body before JSON parsing
**And** `Webhook.constructEvent(rawBody, signatureHeader, signingSecret)` is called; signature failure returns HTTP 400 with ERROR log + alert, never treated as success (NFR9)
**And** the event is inserted into `obituaries_stripe_webhook_event` with `processing_result='pending'`; PK collision on `stripe_event_id` short-circuits and returns HTTP 200 unconditionally (AR-STRIPE-4)
**And** a `StripeEventRouter` dispatches to `handle{EventType}` via a `Map<String, StripeEventHandler>`; unknown event types return HTTP 400 `UNKNOWN_EVENT_TYPE` — never silent 200
**And** `StripeEventHandler.handle(Event)` surfaces `event.getAccount()` so follow-up Stripe calls use `ConnectedAccountStripeClient` when appropriate (Critical Gap 1)
**And** on success, `processed_at` is set and `processing_result='ok'`; on handler exception, `processing_result='error'` and HTTP 500 is returned so Stripe retries per its backoff

### Story 1.5: Append-only audit store

As a compliance auditor,
I want a tamper-proof audit table recording every state-changing business operation,
So that a seven-year retrospective is fully reproducible from Stripe object ids.

**Acceptance Criteria:**

**Given** a migration run against the platform MySQL
**When** the audit table is created
**Then** `obituaries_audit_event` exists with columns `id` PK, `event_type`, `actor_user_id`, `funeral_home_id` nullable, `subject_type`, `subject_id`, `payload_json`, `occurred_at`
**And** the app DB user has been granted `INSERT` and `SELECT` on `obituaries_audit_event` and explicitly not `UPDATE` or `DELETE` (fallback if platform DB-user policy forbids: the `AuditEvent` entity is `@Immutable` and no mutation method exists on `AuditRepository`)
**And** `AuditService.record(eventType, subjectType, subjectId, before, after, reason)` writes a row inside the caller's transaction; audit-write failure rolls back
**And** every reserved event type (`listing_drafted`, `listing_submitted`, `listing_published`, `listing_cancelled`, `invoice_finalized`, `invoice_paid`, `invoice_payment_failed`, `loyalty_points_accrued`, `loyalty_points_redeemed`, `connect_account_created`, `connect_account_updated`, `connect_account_enabled`, `issuing_card_issued`, `issuing_card_status_changed`, `fh_frozen`, `fh_unfrozen`, `admin_override_applied`, `webhook_signature_failed`) is declared in `AuditEventType` enum

### Story 1.6: Tenancy filter and scoped repositories

As a security reviewer,
I want repository-layer tenant filtering that cannot be bypassed by refactoring mistakes,
So that a cross-tenant data leak is structurally impossible from service code.

**Acceptance Criteria:**

**Given** an authenticated FH user session
**When** any `FhScopedRepository<T>` method is called
**Then** the Hibernate `@Filter(name="tenant")` is auto-enabled with `fhId` bound from `TenantResolverService.currentFhId()` by `TenantFilterInterceptor` at session open
**And** a cross-tenant read attempt returns HTTP 403 `TENANT_FORBIDDEN` — never leaks data
**And** cross-tenant methods required by ops (`findAllAcrossTenants`, `findByIdAcrossTenants`) live only on a sibling `OpsRepository<T>` interface
**And** an ArchUnit test fails the build if any `@Query(nativeQuery=true)` method on an `FhScopedRepository` lacks an `fhId` parameter

### Story 1.7: Feature-flag service

As a product lead,
I want a single feature-flag read API so Growth features can ship dark and toggle on at pilot,
So that we can ship code ahead of the decision to expose it.

**Acceptance Criteria:**

**Given** a feature-flag key like `obituaries.loyalty.tier_progress_bar`
**When** any caller invokes `featureFlagService.isEnabled(key)`
**Then** the response is authoritative and cached for a short TTL (seconds-scale)
**And** the default for unknown keys is `false` (fail-safe off)
**And** the implementation delegates to the platform's feature-flag mechanism if present, else an `obituaries_feature_flag` table, else a properties file (decision from Story 1.1's validation report)
**And** an ArchUnit test fails the build if any service uses `@Value("${obituaries...}")` for feature-gating (D36)

### Story 1.8: Funeral-home table extension and Connect-state cache

As a dev agent,
I want the existing Legacy.com `funeral_home` table extended with Stripe columns plus a dedicated Connect-state cache table,
So that every Epic 1 feature story has a persistence foundation.

**Acceptance Criteria:**

**Given** the platform-owned `funeral_home` table
**When** the migration runs
**Then** columns `stripe_connect_account_id VARCHAR(255)` and `billing_status_tier ENUM('PRE_PAY','APPROVED') NOT NULL DEFAULT 'PRE_PAY'` are added (fallback: module-owned `obituaries_funeral_home_extension` table with `funeral_home_id` FK PK — Critical Gap 4)
**And** `obituaries_stripe_connect_account` is created with columns `funeral_home_id FK PK, stripe_account_id VARCHAR(255), state ENUM('pending','needs_info','restricted','enabled'), requirements_due_json JSON, last_updated_at TIMESTAMP(6), last_event_id VARCHAR(255)`
**And** both tables have indexes per platform convention

### Story 1.9: Session-derived FH context and role resolution

As a funeral-home user,
I want the portal to know which funeral home I belong to from my existing Legacy.com sign-in,
So that I don't need a separate login and I only see my own data.

**Acceptance Criteria:**

**Given** a user signed in via the existing Legacy.com session
**When** the user hits any `/obituaries/*` URL
**Then** `TenantResolverService.currentFhId()` returns the FH id derived from the session (FR1, FR2)
**And** the user's role is one of `FH_USER` or `LEGACY_OPS_ADMIN` (FR4)
**And** a request without an authenticated session returns HTTP 401 with no data disclosure (NFR7)
**And** if the platform session does not expose FH identity or role in a consumable form, Story 1.1's report flags this as an MVP blocker and an adaptation story is added

### Story 1.10: Sign-in event logging

As an ops engineer,
I want every sign-in event written to the audit store,
So that unusual login patterns are discoverable without digging in platform logs.

**Acceptance Criteria:**

**Given** a successful sign-in resolving to an FH context
**When** the user first hits a module URL in the session
**Then** an `audit_event` row is written with `event_type='user_signed_in'`, `actor_user_id`, `funeral_home_id`, `occurred_at` (FR7)
**And** the row is emitted at most once per session

### Story 1.11: Initiate Connect Custom account creation

As Legacy ops,
I want to initiate Connect Custom onboarding for a new funeral home by entering legal name, contact email, and country,
So that a Stripe Connected Account exists before the FH completes KYB.

**Acceptance Criteria:**

**Given** ops admin `POST /obituaries/admin/onboarding`
**When** the request body contains `{ legalName, primaryContactEmail, country }`
**Then** `OnboardingService.initiate(...)` validates inputs (non-blank legal name, valid email, ISO-3166 country)
**And** calls `StripeClient.accounts().create(...)` with `type=custom`, idempotency key `IdempotencyKeys.forConnectAccountCreate(legacyFhId)`
**And** persists a new `obituaries_stripe_connect_account` row with `state='pending'` and stores `stripe_account_id` on the `funeral_home` row
**And** writes audit `event_type='connect_account_created'` (FR58)
**And** duplicate initiation for the same legacy FH id returns the existing Connected Account (idempotent)

### Story 1.12: Generate and email hosted account-link

As Legacy ops,
I want the portal to generate a Stripe-hosted account-link URL and email it to the funeral home's contact,
So that the FH owner can complete KYB in one click.

**Acceptance Criteria:**

**Given** a pending `obituaries_stripe_connect_account` row exists
**When** the initiate flow completes (Story 1.11) or ops taps `Send link`
**Then** `StripeClient.accountLinks().create(...)` is called with `type=account_onboarding` and configured return/refresh URLs
**And** the URL is dispatched to the FH's primary contact via `EmailSenderFacade` using the inherited Legacy.com mail sender (NFR23, FR59)
**And** if `EmailSenderFacade` is not yet available, a story to build one is created and this story is blocked
**And** audit `event_type='account_link_generated'`

### Story 1.13: Handle `account.updated` webhook and update Connect-state cache

As an ops engineer,
I want `account.updated` webhooks to idempotently update the Connect-state cache and emit alerts on state transitions,
So that the portal reflects KYB reality within seconds of Stripe changing its mind.

**Acceptance Criteria:**

**Given** a Stripe `account.updated` webhook arrives (routed by Story 1.4)
**When** `AccountUpdatedHandler` processes it
**Then** `ConnectAccountStateService.applyStateUpdate(event)` updates the cache row with new `state`, `requirements_due_json`, `last_updated_at`, `last_event_id`
**And** if the transition crosses into `enabled` for the first time, audit `event_type='connect_account_enabled'` is written and a welcome email is dispatched (FR60)
**And** a transition to `restricted` emits an ops alert via the platform's alerting channel
**And** replay of the same event id produces no duplicate audit row or duplicate email (FR56, FR63)

### Story 1.14: Display Connect state on FH dashboard and ops view

As a funeral-home user,
I want to see my Connect account state and what's needed of me in plain English,
So that I'm never confused about why I can or can't transact.

**Acceptance Criteria:**

**Given** an FH user on the dashboard
**When** the page renders
**Then** a `connectStatusBanner.jsp` fragment shows the cached state: `enabled → "Account active"`, `pending → "Verification in progress"`, `needs_info → "Information needed: {fields}"`, `restricted → "Account restricted — contact support"` (FR61)
**And** the same fragment appears on the Legacy ops FH-detail view with identical wording
**And** the data is the Connect-state cache; no live Stripe call per page load

### Story 1.15: Requirements-due banner with fresh account-link action

As a funeral-home user,
I want a one-click way to resume KYB when Stripe says it needs more from me,
So that I don't have to dig through email for an expired link.

**Acceptance Criteria:**

**Given** the FH's Connect account is in `needs_info` or `restricted` with `requirements_due_json` non-empty
**When** the FH loads the dashboard
**Then** `requirementsDue.jsp` surfaces the specific fields Stripe needs plus a `Resume KYB` button (FR62)
**And** clicking it calls `POST /obituaries/connect/resume-link` which generates a fresh account-link and redirects the browser
**And** the prior account-link is not reused; every click mints a fresh URL

### Story 1.16: Stripe Dashboard deep-link per FH

As Legacy ops,
I want to open Stripe Dashboard for any FH's Connected Account with one click,
So that I can investigate anomalies the portal UI doesn't surface.

**Acceptance Criteria:**

**Given** an ops admin on the FH detail page
**When** they click `Open in Stripe Dashboard`
**Then** a new browser tab opens at `https://dashboard.stripe.com/connect/accounts/{stripe_account_id}` (live or test URL chosen by env) (FR64)
**And** only `LEGACY_OPS_ADMIN` sees the button

### Story 1.17: Resend account-link ops action

As Legacy ops,
I want to resend the onboarding link to any FH still in a non-enabled state,
So that I can unblock a stalled onboarding without waiting for the FH to ask.

**Acceptance Criteria:**

**Given** an FH whose Connect account is not `enabled`
**When** ops clicks `Resend account-link` from the FH detail page
**Then** a fresh hosted account-link is generated via `StripeClient.accountLinks().create(...)` (FR65)
**And** the link is emailed via `EmailSenderFacade`
**And** audit `event_type='account_link_resent'` with `actor_user_id=opsUserId`
**And** if the account is already `enabled`, the button is hidden and a direct API call returns `FEATURE_DISABLED`

### Story 1.18: Daily Connect-state reconciliation job

As an ops engineer,
I want a daily job that compares our cached Connect state to Stripe's truth and alerts on divergence,
So that a lost webhook never leaves an FH stuck in the wrong state indefinitely.

**Acceptance Criteria:**

**Given** the module is deployed
**When** the `@Scheduled(cron = "0 0 2 * * *", zone = "America/New_York")` reconciliation job runs (AR-STRIPE-2)
**Then** it iterates all `obituaries_stripe_connect_account` rows
**And** for each, calls `StripeClient.accounts().retrieve(stripe_account_id)` and compares Stripe's state + requirements to the cache
**And** on divergence, updates the cache idempotently (Stripe is authoritative) and emits an ops alert
**And** respects Stripe's rate limit (backoff on 429)

## Epic 2: Listings & Pre-Pay Invoicing

### Story 2.1: Listing entity, state machine, and schema

As a dev agent,
I want the `Listing` entity, state machine, and `obituaries_listing` schema,
So that every subsequent listings story has a persistence foundation.

**Acceptance Criteria:**

**Given** a migration run
**When** the `obituaries_listing` table is created
**Then** it has columns `id`, `funeral_home_id`, `deceased_name`, `dates_json`, `obituary_text`, `publication_date`, `status ENUM('DRAFT','PENDING','UPCOMING','PUBLISHED','CANCELLED')`, `billing_path ENUM('PARTNER','DIRECT')`, `amount_cents BIGINT`, `currency_code CHAR(3) DEFAULT 'USD'`, `stripe_invoice_id NULL`, `stripe_invoice_item_id NULL`, `created_at`, `updated_at` (AR-DATA-1, AR-DATA-6)
**And** `Listing` JPA entity is annotated `@FilterDef`/`@Filter` for tenancy (D3)
**And** `ListingService` exposes exactly `submitListing(id)`, `publishListing(id)`, `cancelListing(id)`; invalid transitions throw `IllegalStateTransitionException` → HTTP 409 `INVALID_STATE_TRANSITION`
**And** each transition writes an `audit_event` + `state_transition` row (FR14)

### Story 2.2: Newspaper catalog and per-newspaper price quote

As a funeral-home user,
I want to see accurate per-newspaper pricing while building the listing,
So that I know the cost before I submit.

**Acceptance Criteria:**

**Given** an FH user on the listing creation form
**When** they select one or more newspapers and enter obituary text
**Then** `GET /obituaries/listings/price-quote?newspapers=...&wordCount=...` returns a JSON quote with per-newspaper pricing and a total (FR9)
**And** the quote reflects whether each newspaper is `PARTNER`-billed or `DIRECT`-billed (FR10)
**And** prices come from `NewspaperCatalog` reading from `obituaries_newspaper` seeded from Legacy's existing data
**And** the quote is not a commitment; the final persisted price is the one computed at submit

### Story 2.3: Create listing as draft

As a funeral-home user,
I want to save a listing as a draft while I gather details from the family,
So that I don't lose work between family meetings.

**Acceptance Criteria:**

**Given** an FH user on the listing form
**When** they fill partial content and click `Save draft`
**Then** `POST /obituaries/listings` with `status='DRAFT'` persists the listing
**And** `deceased_name` + at least one other field must be non-empty (validation via Bean Validation + jQuery Validation)
**And** the FH lands on the listing detail page with the draft editable
**And** audit `event_type='listing_drafted'` (FR11)

### Story 2.4: Edit listing in draft / pending / upcoming

As a funeral-home user,
I want to edit a listing before it's published,
So that last-minute corrections are possible without calling Legacy.

**Acceptance Criteria:**

**Given** a listing in `DRAFT`, `PENDING`, or `UPCOMING`
**When** the FH clicks `Edit`, changes fields, and saves
**Then** the listing is updated in place
**And** if in `PENDING` / `UPCOMING` and price changes, the MVP re-prices immediately and the audit reflects the change (Growth Epic 12 adds approve/dispute adjustment flow) (FR12)
**And** a listing in `PUBLISHED` or `CANCELLED` returns HTTP 409 `INVALID_STATE_TRANSITION`

### Story 2.5: Submit listing (approved FH — queue for monthly aggregation)

As an approved funeral-home user,
I want to submit a listing and have it queued for my next monthly invoice,
So that my listing publishes at the scheduled date without per-listing payment friction.

**Acceptance Criteria:**

**Given** an FH with `billing_status_tier='APPROVED'` and Connect `enabled`
**When** they `POST /obituaries/listings/{id}/submit`
**Then** `ListingService.submitListing(id)` transitions `DRAFT → PENDING` (FR8, FR14)
**And** if the FH is frozen or Connect is non-`enabled`, returns HTTP 409 `CONNECT_NOT_ENABLED` or `ACCOUNT_FROZEN` and no state transition occurs (FR41 Connect half)
**And** a confirmation email is dispatched via `EmailSenderFacade` (FR48)
**And** audit `event_type='listing_submitted'`

### Story 2.6: Submit listing (pre-pay FH — immediate Stripe hosted invoice)

As a pre-pay funeral-home user,
I want to submit my listing and pay via a Stripe-hosted page before it publishes,
So that I can place orders without a billing relationship.

**Acceptance Criteria:**

**Given** an FH with `billing_status_tier='PRE_PAY'` and Connect `enabled`
**When** they `POST /obituaries/listings/{id}/submit`
**Then** a per-listing Stripe invoice is created on the FH's Connected Account via `ConnectedAccountStripeClient.invoices().create(...)` then finalised (FR23)
**And** idempotency keys are `listing-{id}-create-invoice` / `listing-{id}-finalize-invoice`
**And** the hosted-invoice URL is returned to the browser; the FH is redirected to Stripe to pay
**And** the listing is in `PENDING`
**And** on `invoice.paid` webhook (Epic 3 handler) the listing transitions `PENDING → UPCOMING`, then at publication-date-reached moves to `PUBLISHED`

### Story 2.7: View listing detail

As a funeral-home user,
I want to see the full detail of any listing I own,
So that I can reference it later or verify what was published.

**Acceptance Criteria:**

**Given** an FH user with an owned listing id
**When** they `GET /obituaries/listings/{id}`
**Then** the response returns `id, deceasedName, dates, obituaryText, newspapers[], status, billingPath, amountCents, currencyCode, createdAt, publishedAt, stripeInvoiceId` (FR13)
**And** a request for another FH's listing id returns HTTP 403 `TENANT_FORBIDDEN`

### Story 2.8: List my listings

As a funeral-home user,
I want to see all my listings in one table with current status,
So that I know at a glance what's drafted, pending, upcoming, or published.

**Acceptance Criteria:**

**Given** an FH user
**When** they open `/obituaries/listings`
**Then** the page renders a Bootstrap table sorted by `created_at DESC` with columns `deceased name, publication date, newspapers, status, amount`
**And** pagination inherits the platform convention (default page size 25)
**And** the page meets NFR1 (p95 < 1.5s FCP) under typical FH-size data

## Epic 3: Monthly Aggregation & Approved Billing

### Story 3.1: Monthly invoice entity and schema

As a dev agent,
I want the `Invoice` entity and `obituaries_invoice` schema,
So that monthly aggregation has somewhere to land.

**Acceptance Criteria:**

**Given** a migration run
**When** the schema is created
**Then** `obituaries_invoice` has columns `id`, `friendly_id` (`INV-YYYY-MM`), `funeral_home_id`, `status ENUM('DRAFT','FINALIZED','OPEN','PAID','UNCOLLECTIBLE','VOID')`, `period_start`, `period_end`, `amount_due_cents BIGINT`, `amount_paid_cents BIGINT`, `currency_code CHAR(3)`, `stripe_invoice_id VARCHAR(255)`, `hosted_invoice_url VARCHAR(1000)`, `invoice_pdf_url VARCHAR(1000)`, `due_date`, `created_at`, `updated_at`
**And** unique constraint on `(funeral_home_id, friendly_id)` so a retry of month-close doesn't create duplicates

### Story 3.2: Monthly close scheduler

As an approved funeral-home user,
I want my listings to aggregate into one invoice at month end automatically,
So that I don't see individual Stripe charges for every listing.

**Acceptance Criteria:**

**Given** an approved FH with one or more `PENDING`-state listings whose `publication_date` falls in the current-or-past month
**When** `MonthlyCloseScheduler` fires on the 1st of each month at 00:00 `America/New_York` (AR-STRIPE-3)
**Then** for each approved FH with eligible listings, an `obituaries_invoice` row is created with `friendly_id="INV-"+prevMonth` and `status='DRAFT'`
**And** for each eligible listing, `ConnectedAccountStripeClient.invoiceItems().create(...)` adds an item with idempotency key `listing-{listingId}-create-invoice-item`
**And** the Stripe invoice is finalised via `ConnectedAccountStripeClient.invoices().finalizeInvoice(...)` with idempotency key `invoice-{invoiceId}-finalize`
**And** `stripe_invoice_id`, `hosted_invoice_url`, `invoice_pdf_url` are persisted
**And** audit `event_type='invoice_finalized'`
**And** running the scheduler a second time for the same month is idempotent (FR18, FR24)

### Story 3.3: `invoice.finalized` webhook handler

As an ops engineer,
I want the portal to reflect Stripe's authoritative `FINALIZED` status when it arrives,
So that the portal never shows `DRAFT` for an invoice Stripe considers finalised.

**Acceptance Criteria:**

**Given** Stripe sends `invoice.finalized` with `event.account={fh_account_id}`
**When** `InvoiceFinalizedHandler` processes it
**Then** the matching `obituaries_invoice` row's `status` updates to `FINALIZED` via `UPDATE ... WHERE stripe_invoice_id=? AND status IN ('DRAFT','FINALIZED')` (idempotent)
**And** audit `event_type='invoice_finalized'` is de-duplicated by `subject_id`

### Story 3.4: List + detail monthly invoices

As a funeral-home user,
I want to see my invoices sorted by period with status, amount, and listings,
So that I can reconcile against my own records.

**Acceptance Criteria:**

**Given** an FH user
**When** they `GET /obituaries/invoices`
**Then** the list shows invoices sorted by `period_end DESC` with `friendly_id, period, amount due, amount paid, status, due date`
**And** the 24-month window renders in p95 < 1s (NFR3)
**And** `GET /obituaries/invoices/{id}` shows the same plus the comprising listings (FR19)

### Story 3.5: Finalise + pay monthly invoice via Stripe-hosted page

As a funeral-home user,
I want to open the Stripe-hosted invoice page and pay with a card Stripe-side,
So that my card data never touches Legacy.com.

**Acceptance Criteria:**

**Given** a finalised invoice with `hosted_invoice_url` populated
**When** the FH clicks `Pay now` on the invoice detail page
**Then** the browser opens the `hosted_invoice_url` in a new tab
**And** the portal does not render any card input UI (FR20, NFR6)
**And** on return, the invoice status updates via `invoice.paid` webhook — not polling

### Story 3.6: `invoice.paid` webhook handler publishes listings and accrues loyalty

As an ops engineer,
I want `invoice.paid` to mark the invoice paid, publish all its listings, and trigger loyalty accrual atomically,
So that a single webhook transitions the full state consistently.

**Acceptance Criteria:**

**Given** Stripe sends `invoice.paid` for a finalised invoice
**When** `InvoicePaidHandler` processes it
**Then** `InvoiceService.markPaid(invoiceId)` updates `status='PAID'` and `amount_paid_cents` via `UPDATE ... WHERE id=? AND status!='PAID'` (idempotent) (FR24)
**And** `ListingService.publishInvoiceListings(invoiceId)` transitions each associated listing to `PUBLISHED` (FR25); audit `event_type='listing_published'` per listing
**And** `LoyaltyService.accrueFor(invoiceId)` creates a points-earned ledger row (FR31 — Epic 4)
**And** handler is idempotent on replay (no duplicate state or audit)
**And** a confirmation email is dispatched via `EmailSenderFacade` (FR48)

### Story 3.7: `invoice.payment_failed` webhook handler marks overdue

As an ops engineer,
I want `invoice.payment_failed` to mark the invoice overdue so Legacy ops' queue shows it,
So that finance visibility catches up with reality without a manual review.

**Acceptance Criteria:**

**Given** Stripe sends `invoice.payment_failed`
**When** `InvoicePaymentFailedHandler` processes it
**Then** the invoice's `status` is `OPEN` and an overdue flag is computed from `due_date` and `period_end` (FR24)
**And** audit `event_type='invoice_payment_failed'`
**And** no automatic freeze is triggered in MVP (Epic 5 covers manual freeze; Epic 8 adds auto-freeze in Growth)

### Story 3.8: Download invoice PDF

As a funeral-home user,
I want to download the PDF of any finalised or paid invoice,
So that I have a record for my books.

**Acceptance Criteria:**

**Given** an invoice with `invoice_pdf_url` populated
**When** the FH clicks `Download PDF`
**Then** the server-side calls `ConnectedAccountStripeClient.invoices().retrieve(...)`, fetches the PDF URL, streams it with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="{friendly_id}.pdf"` (FR21)
**And** downloads are disabled on `DRAFT`-state invoices

### Story 3.9: Bulk-export invoice PDF zip with summary

As a funeral-home user,
I want to download a zip of every finalised invoice PDF plus a summary CSV,
So that my bookkeeper has one file to consume.

**Acceptance Criteria:**

**Given** an FH with one or more finalised or paid invoices
**When** the FH clicks `Download all`
**Then** `BulkInvoiceExportService` streams a zip containing one `{friendly_id}.pdf` per invoice plus a `_summary.csv` with columns `friendly_id, period_start, period_end, amount_due, amount_paid, status, due_date` (FR22)
**And** the response streams (not buffered) for up to 24 months of history

### Story 3.10: Multi-invoice cart drawer

As a funeral-home user,
I want to select several unpaid invoices and pay them in one session,
So that I don't click through multiple hosted-invoice pages.

**Acceptance Criteria:**

**Given** an FH with 2+ unpaid invoices
**When** they check multiple invoices and click `Pay selected`
**Then** the cart drawer opens listing invoices with total-to-pay
**And** `Proceed to pay` opens each `hosted_invoice_url` sequentially in a new tab (MVP — embedded Payment Element is Growth Epic 8) (FR26)
**And** the cart state persists in `sessionStorage` so a refresh doesn't lose selection

## Epic 4: Loyalty Earning & Redemption

### Story 4.1: Loyalty points ledger schema and accrual trigger

As a dev agent,
I want a points ledger and the accrual hook from `invoice.paid` / pre-pay listing publish,
So that points are granted when money is actually collected — never on listing creation alone.

**Acceptance Criteria:**

**Given** a migration run
**When** `obituaries_loyalty_points_event` is created
**Then** it has columns `id`, `funeral_home_id`, `event_type ENUM('EARNED','REDEEMED')`, `points_delta INT`, `reference_type VARCHAR(50)`, `reference_id BIGINT`, `occurred_at`
**And** `LoyaltyService.accrueFor(invoiceId)` (Story 3.6 hook) inserts `EARNED` rows with points from invoice line items per Legacy's accrual rate (FR31)
**And** `LoyaltyService.accrueForPrePayPublish(listingId)` inserts `EARNED` rows when a pre-pay listing publishes
**And** audit `event_type='loyalty_points_accrued'`
**And** never accrues on `listing_submitted` — only on final billing state

### Story 4.2: View points balance and tier

As a funeral-home user,
I want to see my current loyalty points balance and tier,
So that I know where I stand before I redeem.

**Acceptance Criteria:**

**Given** an FH user
**When** they `GET /obituaries/loyalty` or load the dashboard
**Then** the balance is computed as `SUM(points_delta) WHERE funeral_home_id=?`
**And** the tier is derived via `TierCalculator` using product-config thresholds (FR32)
**And** the dashboard widget renders balance + tier name in a Bootstrap card

### Story 4.3: View points history

As a funeral-home user,
I want a chronological history of every points event,
So that I can verify my accruals match the invoices I've paid.

**Acceptance Criteria:**

**Given** an FH user
**When** they `GET /obituaries/loyalty/history`
**Then** a table shows `date, type (Earned/Redeemed), points, reference` sorted by `occurred_at DESC` (FR33)
**And** paginates at the platform default page size

### Story 4.4: Fulfilment strategy interface + selector

As a dev agent,
I want `FulfilmentStrategy` interface and `FulfilmentSelector` so Issuing and Tremendous are swappable by config,
So that a Stripe Issuing approval slip doesn't block MVP redemption launch.

**Acceptance Criteria:**

**Given** module startup
**When** beans are wired
**Then** `FulfilmentStrategy` declares `issueReward(fhId, redemptionId, rewardSpec) → RewardHandle`
**And** `IssuingFulfilmentStrategy` and `TremendousFulfilmentStrategy` exist
**And** `FulfilmentSelector.strategy()` reads `featureFlagService.isEnabled("obituaries.loyalty.use_tremendous")` — default Issuing
**And** switching providers is a config-only change, no code release (NFR22)

### Story 4.5: Redeem points via Stripe Issuing on Connected Account

As a funeral-home user,
I want to redeem points for a digital Visa virtual card issued on my own Connected Account,
So that the cardholder is my legal entity and the card is usable immediately.

**Acceptance Criteria:**

**Given** an FH with sufficient points and a selected reward
**When** the FH `POST /obituaries/loyalty/redeem`
**Then** `RedemptionService.redeem(fhId, points, rewardSpec)` is invoked
**And** `LoyaltyService.debit(fhId, points)` writes a `REDEEMED` ledger row (audit `loyalty_points_redeemed`)
**And** `IssuingFulfilmentStrategy.issueReward(...)` calls `ConnectedAccountStripeClient.issuing.cardholders().create(...)` (or retrieves existing) with idempotency key `cardholder-fh-{fhId}` — cardholder = FH legal entity (FR34)
**And** then `ConnectedAccountStripeClient.issuing.cards().create(...)` with idempotency key `redemption-{redemptionId}-issue-card` and `spending_controls` sized to reward value
**And** the `RedeemedCard` row is persisted with `stripe_card_id`, `remaining_balance_cents_cached`, `issued_at`
**And** audit `event_type='issuing_card_issued'`

### Story 4.6: Reveal card details via Stripe ephemeral keys

As a funeral-home user,
I want to see my new card's number, expiry, and CVV immediately after redemption,
So that I can use it right away without waiting for physical fulfilment.

**Acceptance Criteria:**

**Given** a freshly-issued `RedeemedCard`
**When** the redemption success page loads
**Then** the server mints a Stripe ephemeral key via `ConnectedAccountStripeClient.ephemeralKeys().create(...)` scoped to the card id (FR35)
**And** the page loads Stripe.js from CDN and renders the card-number / expiry / CVV in Stripe's secure iframe using the ephemeral key
**And** sensitive details never transit Legacy.com persistence (NFR6)
**And** the ephemeral key expires per Stripe default; re-reveal requires a fresh key request

### Story 4.7: My Cards list with remaining balances

As a funeral-home user,
I want to see all my redeemed cards and their remaining balances,
So that I can track what's still usable.

**Acceptance Criteria:**

**Given** an FH user with one or more redeemed cards
**When** they open `/obituaries/loyalty/cards`
**Then** a list shows each card with `last4, issued_at, reward_name, remaining_balance_cents`
**And** remaining balances are fetched from `ConnectedAccountStripeClient.issuing.transactions().list(...)` aggregated against original card value (FR36)
**And** only `last4`, `issued_at`, and `stripe_card_id` are persisted — never full card details

## Epic 5: Billing Exception Handling

### Story 5.1: Freeze / unfreeze funeral home (ops)

As Legacy ops,
I want to freeze or unfreeze a funeral home's account with a single toggle,
So that I can contain an overdue situation and release it when payment arrives.

**Acceptance Criteria:**

**Given** an ops admin on the FH detail page
**When** they click `Freeze` (or `Unfreeze`)
**Then** `FreezeService.freeze(fhId, reason)` or `.unfreeze(fhId, reason)` flips a boolean column on the FH row
**And** audit `event_type='fh_frozen'` or `'fh_unfrozen'` with `actor_user_id=opsUserId`, `reason` (FR44)
**And** only `LEGACY_OPS_ADMIN` can invoke; other roles return 403

### Story 5.2: Frozen-state gating on new-listing and redemption

As a funeral-home user,
I want to see a clear explanation if my account is frozen,
So that I know exactly what to do instead of seeing inscrutable button-disabled states.

**Acceptance Criteria:**

**Given** an FH with `frozen=true`
**When** they attempt `POST /obituaries/listings/{id}/submit` or `POST /obituaries/loyalty/redeem`
**Then** the call returns HTTP 409 `ACCOUNT_FROZEN` with plain-English message (FR41 frozen half)
**And** the dashboard renders `freezeBanner.jsp` explaining the freeze + the outstanding invoice + a CTA to pay
**And** the `New Obituary` button opens an explanatory popup rather than the form

### Story 5.3: In-context CTA from freeze banner to hosted-invoice payment

As a funeral-home user,
I want the freeze banner to take me straight to the overdue invoice's Stripe payment page,
So that I can fix the situation without hunting for the link.

**Acceptance Criteria:**

**Given** an FH sees the freeze banner
**When** they click `Pay overdue invoice`
**Then** the newest `OPEN`-status invoice's `hosted_invoice_url` opens in a new tab
**And** when `invoice.paid` arrives via Epic 3, the invoice flips to `PAID` and listings publish
**And** the FH remains frozen until ops unfreezes (MVP); self-service unfreeze is Growth Epic 8

### Story 5.4: `invoice.payment_failed` surfaces in overdue banner and log

As an ops engineer,
I want payment failures visible in the FH dashboard and ops queue without manual investigation,
So that the next touchpoint is obvious.

**Acceptance Criteria:**

**Given** an `invoice.payment_failed` webhook has arrived (Epic 3 Story 3.7)
**When** the FH next opens the portal
**Then** the invoice detail shows `Payment failed — {reason}` with the hosted-invoice URL for retry (FR24 + FR41)
**And** the ops queue (Epic 6) includes this invoice
**And** an ops alert is emitted on transition into overdue

## Epic 6: Internal Operations Console

### Story 6.1: Admin landing + navigation scoped to ops role

As Legacy ops,
I want a dedicated admin home with navigation to every ops surface,
So that I don't have to memorise URLs.

**Acceptance Criteria:**

**Given** a `LEGACY_OPS_ADMIN` user
**When** they load `/obituaries/admin`
**Then** the page shows navigation cards for Funeral Homes, Service Fees, Overdue Queue, Simulated Errors (non-prod only)
**And** non-admin users receive HTTP 403 `TENANT_FORBIDDEN`
**And** the `Simulated Errors` card is hidden in production

### Story 6.2: Service Fees read-only roll-up

As Legacy ops,
I want a per-billing-partner roll-up of commission owed with per-listing detail,
So that I can reconcile what each newspaper is owed for the period.

**Acceptance Criteria:**

**Given** an ops admin on `/obituaries/admin/service-fees`
**When** the page loads for a selected month
**Then** it shows per-billing-partner: `listing count, gross listing value, commission %, commission owed` (FR43)
**And** clicking a row expands a per-listing breakdown with invoice id, FH name, amount, status
**And** the page is read-only — no mutation endpoints exposed

### Story 6.3: Overdue invoice queue

As Legacy ops,
I want a cross-tenant queue of all overdue monthly invoices,
So that I can prioritise outreach without clicking through every FH.

**Acceptance Criteria:**

**Given** an ops admin on `/obituaries/admin/overdue`
**When** the page loads
**Then** it lists every invoice where `status='OPEN'` and `due_date<today`, sorted by `days_overdue DESC` (FR45)
**And** each row shows FH name, friendly id, amount, days overdue, last payment attempt
**And** each row links to the FH detail page with freeze/unfreeze (Epic 5)

### Story 6.4: Simulated-error toggle (non-prod only)

As Legacy ops,
I want to flip a simulated-error toggle in non-prod that makes the next payment flow return a synthetic failure,
So that I can demo the failure path and QA can test recovery.

**Acceptance Criteria:**

**Given** a non-prod environment and an ops admin
**When** they toggle `Simulate payment error` on
**Then** the next Epic-3 payment-finalising endpoint returns a synthetic `invoice.payment_failed`-equivalent state (FR46)
**And** attempting to enable in production returns HTTP 403 `FEATURE_DISABLED` (env-check enforced in code, not just config)
**And** audit `event_type='simulated_error_toggled'` with `actor_user_id`

## Epic 7: Order Wizard & Upsells *(Growth)*

### Story 7.1: Four-step wizard scaffold with back-navigation state preservation

As a funeral-home user,
I want to place orders through a guided wizard instead of a single big form,
So that I don't lose track of what I've entered on longer orders.

**Acceptance Criteria:**

**Given** `obituaries.listings.order_wizard` is on
**When** the FH clicks `New obituary`
**Then** a four-step wizard opens (1 deceased, 2 obituary text, 3 newspapers + upsells, 4 review)
**And** `Back` preserves all prior step state (FR15)
**And** `Cancel` confirms before discarding
**And** each step validates server-side on `Next`; errors surface inline

### Story 7.2: Draft save from any wizard step

As a funeral-home user,
I want to save a wizard draft at any step,
So that I don't lose work if a family call interrupts me.

**Acceptance Criteria:**

**Given** the wizard is open with partial content
**When** the FH clicks `Save draft`
**Then** the partial listing persists with `status='DRAFT'` and enough state to resume on the same step
**And** returning via listings list opens the draft on the last step completed

### Story 7.3: Priced upsells catalogue and add-to-listing

As a funeral-home user,
I want to add priced upsells (photo, candle, online memorial) to my listing,
So that families can enhance the memorial without a separate transaction.

**Acceptance Criteria:**

**Given** the wizard is at step 3
**When** the FH selects upsells from the catalogue
**Then** each upsell is added to the price quote as its own line item (FR16)
**And** upsells flow through to the Stripe invoice as separate line items on commit
**And** the catalogue is seeded from `obituaries_upsell`

### Story 7.4: Cancel listing pre-publication with credit note

As a funeral-home user,
I want to cancel a listing before publication and receive a credit note or refund,
So that a family cancellation doesn't cost me money.

**Acceptance Criteria:**

**Given** a listing in `PENDING` or `UPCOMING`
**When** the FH clicks `Cancel`
**Then** `ListingService.cancelListing(id)` transitions to `CANCELLED`
**And** if the listing has a Stripe invoice item, `ConnectedAccountStripeClient.creditNotes().create(...)` is called with idempotency key `listing-{id}-credit-note` (FR17)
**And** if pre-pay and already paid, `ConnectedAccountStripeClient.refunds().create(...)` is called
**And** audit `event_type='listing_cancelled'` with reason

### Story 7.5: Wizard review step with live price + points preview

As a funeral-home user,
I want to see my total + points earned on the review step before I commit,
So that the order is surprise-free.

**Acceptance Criteria:**

**Given** the wizard is at step 4
**When** the review step renders
**Then** it shows each newspaper + upsell line item with price, total, and "You will earn {n} points on successful billing"
**And** `Submit` commits via Epic 2's submit paths (approved monthly / pre-pay immediate)

## Epic 8: Automated Billing *(Growth)*

### Story 8.1: Card-on-file storage for approved FHs

As an approved funeral-home user,
I want to save a card to my account so my monthly invoice auto-charges,
So that I never miss a payment due to a forgotten email.

**Acceptance Criteria:**

**Given** an approved FH on the billing settings page
**When** they click `Save card` and complete Stripe Payment Element capture
**Then** a Stripe `SetupIntent` confirms and the resulting `payment_method` id is attached to the Connected Account's default for invoicing
**And** no card PAN ever enters Legacy.com (NFR6)

### Story 8.2: Auto-advance monthly invoice on due date

As an approved funeral-home user with a card on file,
I want my monthly invoice to charge automatically on its due date,
So that finance is hands-off for me.

**Acceptance Criteria:**

**Given** an invoice with `auto_advance=true` and a default card on file
**When** the due date arrives
**Then** Stripe's `auto_advance` attempts the charge (FR27)
**And** `invoice.paid` / `invoice.payment_failed` webhooks reflect outcome via Epic 3 handlers
**And** feature is off unless `obituaries.billing.auto_advance` is enabled for the FH

### Story 8.3: Embedded Stripe Payment Element for pre-pay

As a pre-pay funeral-home user,
I want to pay inside the portal without redirecting to a hosted Stripe page,
So that checkout is one step.

**Acceptance Criteria:**

**Given** `obituaries.pre_pay.payment_element` is on
**When** a pre-pay FH submits a listing
**Then** an embedded Stripe Payment Element renders on the review step using a `PaymentIntent`-on-Connected-Account
**And** on successful confirm, the listing proceeds through the same `invoice.paid` path (FR28)
**And** saved cards are selectable

### Story 8.4: Automated dunning on overdue monthly invoice

As Legacy ops,
I want automated reminder emails when a monthly invoice is overdue,
So that my team doesn't manually chase every FH.

**Acceptance Criteria:**

**Given** an invoice transitions to overdue
**When** the dunning scheduler fires (default cadence days 3/7/14/21 overdue)
**Then** a branded reminder email is sent via `EmailSenderFacade` with the hosted-invoice URL (FR29)
**And** each cadence step is idempotent per invoice — no double-sends
**And** audit `event_type='dunning_email_sent'` with cadence step

### Story 8.5: Dunning cadence configuration console

As Legacy ops,
I want to configure reminder cadences per-FH or globally,
So that high-value relationships can have a softer touch.

**Acceptance Criteria:**

**Given** an ops admin on `/obituaries/admin/dunning`
**When** they edit a cadence (days-overdue thresholds + email template)
**Then** the change takes effect at the next scheduler run (FR47)
**And** audit `event_type='dunning_config_changed'`

### Story 8.6: Self-service unfreeze on payment

As a funeral-home user,
I want my frozen account to automatically unfreeze when I pay the overdue invoice,
So that I'm not blocked waiting for ops to notice.

**Acceptance Criteria:**

**Given** `obituaries.billing.self_service_unfreeze` is on and an FH is frozen due to one overdue invoice
**When** `invoice.paid` webhook arrives for that invoice
**Then** `FreezeService.autoUnfreeze(fhId, invoiceId)` fires if and only if no other overdue invoices exist
**And** audit `event_type='fh_unfrozen'` with `actor='system'`, `reason='self_service_on_payment'`

### Story 8.7: Pre-pay → Approved upgrade pathway

As a pre-pay funeral-home user with sufficient history,
I want to apply for Approved billing from inside the portal,
So that I don't have to email Legacy or re-do KYB.

**Acceptance Criteria:**

**Given** a pre-pay FH who has placed ≥ N orders over ≥ M months (thresholds configurable)
**When** they load the dashboard
**Then** a progress widget shows `"You've placed X orders in Y months. You qualify for an Approved account — apply now"` (FR42)
**And** clicking `Apply` submits an underwriting-review request to ops (no new bank link or KYB re-run)
**And** ops can approve/decline from the admin console; approval flips `billing_status_tier='APPROVED'`
**And** audit `event_type='billing_status_tier_changed'` with before/after

## Epic 9: Multi-User RBAC & Chain Accounts *(Growth)*

### Story 9.1: FH Admin role and user invite flow

As an FH admin,
I want to invite other users into my funeral home,
So that I can delegate work without sharing my own login.

**Acceptance Criteria:**

**Given** an FH admin on `/obituaries/users`
**When** they enter an invitee email + role (Admin/Ordering/Accounts) and click `Invite`
**Then** the platform's existing sign-in invite flow is triggered + an `obituaries_fh_user_role` row is queued to assign the role on first sign-in (FR5)
**And** audit `event_type='fh_user_invited'`

### Story 9.2: Role model — Admin / Ordering / Accounts permissions

As a dev agent,
I want Spring Security annotations mapping FH sub-roles to endpoints,
So that an Ordering-role user can't touch billing settings.

**Acceptance Criteria:**

**Given** the FH role model is active (feature flag `obituaries.rbac.fh_subroles`)
**When** a user with role `Ordering` hits a billing endpoint
**Then** the call returns HTTP 403 `TENANT_FORBIDDEN`
**And** role matrix enforced: `FH_ADMIN` can invite + see all; `FH_ORDERING` can create/submit listings + redeem (per policy); `FH_ACCOUNTS` can see invoices + payments + exports but not create listings

### Story 9.3: Audit log surface for FH admin

As an FH admin,
I want to see a log of actions taken on my funeral home,
So that I can investigate unexpected changes.

**Acceptance Criteria:**

**Given** an FH admin on `/obituaries/audit-log`
**When** the page loads
**Then** it shows the FH's audit_event rows sorted by `occurred_at DESC` with columns `when, who, what, reference`
**And** filter by date range and event type

### Story 9.4: Chain tenant model

As a dev agent,
I want a `chain` tenant layer linking multiple FHs under a parent,
So that chain users can see across their homes while still respecting tenancy.

**Acceptance Criteria:**

**Given** a migration
**When** `obituaries_chain` + `obituaries_chain_funeral_home` are created
**Then** a chain has many FHs; a user's session can resolve to a chain id (FR6)
**And** chain users' repository queries auto-scope to the chain's FH ids (read-only by default)

### Story 9.5: Chain consolidated dashboard

As a chain accounts manager,
I want one dashboard showing all my FHs,
So that I can see activity across the chain without switching contexts.

**Acceptance Criteria:**

**Given** a chain user signs in
**When** they load `/obituaries/chain/dashboard`
**Then** a table shows each FH with `name, current balance, upcoming invoice status, listings this month`
**And** drilling into an FH opens read-only views of its listings/invoices

### Story 9.6: Chain-wide consolidated CSV export

As a chain accounts manager,
I want a consolidated CSV across all my FHs filterable by date range,
So that my month-end Sage upload is one file.

**Acceptance Criteria:**

**Given** a chain user on the chain dashboard
**When** they click `Export CSV` with a date range
**Then** a CSV streams with one row per listing across all FHs: `funeral_home, listing_id, deceased, newspapers, amount, status, invoice_friendly_id, invoice_status, adjustment_flag` (FR30)

## Epic 10: Loyalty Tier Experience *(Growth)*

### Story 10.1: Tier threshold configuration and calculator

As a product lead,
I want Bronze / Silver / Gold tier thresholds configurable by product without a release,
So that we can tune tier progression based on usage data.

**Acceptance Criteria:**

**Given** thresholds live in product config (property file or admin-only config table)
**When** `TierCalculator.forBalance(balance)` is called
**Then** the correct tier is returned
**And** thresholds can be changed at runtime, reflected on next page load

### Story 10.2: Visible tier + progress-bar UI

As a funeral-home user,
I want to see my tier with a progress bar toward the next tier,
So that I feel the progression.

**Acceptance Criteria:**

**Given** `obituaries.loyalty.tier_progress_bar` is on
**When** the loyalty dashboard loads
**Then** it shows a tier badge + progress bar with `"X of Y points to {next_tier}"` copy (FR37)
**And** the bar is keyboard-accessible and meets WCAG 2.1 AA

### Story 10.3: Account-credit redemption

As a funeral-home user,
I want to redeem points for credit on my next monthly invoice,
So that I get immediate value without a physical product.

**Acceptance Criteria:**

**Given** `obituaries.loyalty.account_credit_redemption` is on and the FH has sufficient points
**When** they redeem for `account_credit`
**Then** `LoyaltyService.debit(...)` writes `REDEEMED`
**And** `obituaries_pending_credit` stages a row; the next monthly close subtracts the credit via a negative invoice item (FR38)
**And** audit `event_type='loyalty_redeemed_account_credit'`

### Story 10.4: Gold-tier CPD voucher redemption

As a Gold-tier funeral-home user,
I want to redeem for a CPD voucher at Gold tier,
So that my loyalty translates into professional-development value.

**Acceptance Criteria:**

**Given** the FH is Gold tier and `obituaries.loyalty.cpd_redemption` is on
**When** they redeem for `cpd_voucher`
**Then** the voucher is issued via the Tremendous fulfilment path (or configured CPD integration)
**And** audit `event_type='loyalty_redeemed_cpd'`

### Story 10.5: Tier-crossing and redemption-threshold notifications

As a funeral-home user,
I want a notification when I cross a tier or pass a redemption threshold,
So that I feel the progression rewarded in real time.

**Acceptance Criteria:**

**Given** a points-earned event crosses a tier threshold
**When** the event is processed
**Then** a branded email and in-portal notification are emitted via Epic 11's surfaces (FR39)
**And** duplicate crossings in the same calendar month produce one notification

## Epic 11: Notifications Centre & Preferences *(Growth)*

### Story 11.1: In-portal notification centre

As a funeral-home user,
I want a notification centre listing recent account / billing / loyalty events,
So that I can catch up on what happened without digging through email.

**Acceptance Criteria:**

**Given** `obituaries.notifications.centre` is on
**When** an FH user clicks the bell icon in the header
**Then** a drawer shows recent notifications with icon + title + deep-link (FR49)
**And** unread count is surfaced in the bell icon
**And** clicking a notification marks it read and navigates to the linked screen

### Story 11.2: Branded email notifications for defined event set

As a funeral-home user,
I want branded emails for invoice issued / payment failed / redemption succeeded / tier milestone reached,
So that I can trust the emails are from Legacy and not phishing.

**Acceptance Criteria:**

**Given** `obituaries.notifications.branded_emails` is on
**When** one of the defined events fires
**Then** a branded HTML email is sent via `EmailSenderFacade` with consistent header / footer / colour palette (FR50)
**And** the email honours the user's preference-centre opt-outs (Story 11.3)

### Story 11.3: Preference centre for email opt-outs

As a funeral-home user,
I want to opt out of specific email categories,
So that I'm not overwhelmed by notifications I don't need.

**Acceptance Criteria:**

**Given** an FH user on `/obituaries/notifications/preferences`
**When** they toggle a category off
**Then** the preference persists per user
**And** the next event of that category skips the email send
**And** the in-portal notification is still written (centre is authoritative; email is opt-out)

## Epic 12: Order Adjustment Flow *(Growth)*

### Story 12.1: Price-change notification with before/after + reason

As a funeral-home user,
I want to see a notification when a newspaper's pricing or word-count change my listing's price,
So that I'm never surprised on the invoice.

**Acceptance Criteria:**

**Given** `obituaries.adjustments.enabled` is on and a listing in `PENDING`/`UPCOMING` changes price
**When** the change is applied
**Then** an `obituaries_adjustment` row is created with `listing_id, before_cents, after_cents, reason, actor, adjusted_at` (FR51)
**And** an in-portal notification + optional branded email is emitted to the FH

### Story 12.2: Approve adjustment → matching Stripe correction

As a funeral-home user,
I want to approve a price adjustment and see the correct line item on my invoice,
So that my records match Stripe's.

**Acceptance Criteria:**

**Given** a pending adjustment on a listing with a Stripe invoice item
**When** the FH clicks `Approve`
**Then** if the adjustment is an increase: `ConnectedAccountStripeClient.invoiceItems().create(...)` adds a correction with idempotency key `adjustment-{id}-correction` (FR52)
**And** if the adjustment is a decrease: `ConnectedAccountStripeClient.creditNotes().create(...)` issues a credit note with idempotency key `adjustment-{id}-credit-note`
**And** audit `event_type='adjustment_approved'`

### Story 12.3: Dispute adjustment (route to ops)

As a funeral-home user,
I want to dispute an adjustment I think is wrong,
So that ops reviews it before my invoice lands.

**Acceptance Criteria:**

**Given** a pending adjustment
**When** the FH clicks `Dispute` with a reason
**Then** the adjustment is flagged for ops review; row state moves to `DISPUTED`
**And** ops sees the dispute in the overdue/adjustments queue
**And** audit `event_type='adjustment_disputed'` with reason

### Story 12.4: Per-listing adjustment history

As a funeral-home user,
I want to see every price change a listing has been through,
So that I can audit my own records without calling ops.

**Acceptance Criteria:**

**Given** a listing with one or more adjustments
**When** the FH opens the listing detail
**Then** an `Adjustments` tab shows rows: `when, before, after, delta, reason, actor, status (pending / approved / disputed)` (FR53)
