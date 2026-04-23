---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
lastStep: 8
status: complete
completedAt: 2026-04-23
inputDocuments:
  - planning/prd.md
workflowType: architecture
project_name: Obituaries Portal
user_name: Richard.livingstone
date: 2026-04-23
outputPath: planning/architecture.md
targetStack: JDK 17 + Spring Boot / JSP + JSTL + jQuery 3.6.1 + jQuery UI + Bootstrap / MySQL + Hibernate / Stripe / AWS EC2 / Jenkins / Snyk / Bitbucket
hostingInfrastructure: AWS EC2 (primary + failover) — inherited from the existing Legacy.com platform; module deploys inside the existing Spring Boot monolith artifact, no new deployment units
projectClassification:
  projectType: saas_b2b
  domain: fintech-adjacent
  complexity: medium-high
  projectContext: brownfield
stripeArchitecture: Connect Custom foundational; FHs are Custom Connected Accounts; Issuing on Connected Accounts; Tremendous fallback
constraints:
  - Brownfield module inside existing Legacy.com Java/Spring/MySQL monolith on AWS EC2
  - JSP + JSTL + jQuery + Bootstrap (no SPA framework)
  - No microservices, no new deployment units, no background-job framework, no new mail infrastructure
  - PCI DSS SAQ-A — card data never transits Legacy.com servers
  - Webhook signature verification mandatory; persistent MySQL idempotency; deterministic outbound idempotency keys
  - Integer-cents BIGINT money storage; USD-only
  - Desktop-first (≥1280px primary, 1024px minimum); no mobile/PWA/offline
  - Match existing Legacy.com paradigms; security is the only non-negotiable override
---

# Architecture Decision Document — Obituaries Portal

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Hosting & Infrastructure (provisional)

- **Compute:** AWS EC2, primary + failover, inherited from the existing Legacy.com platform. No new instances, auto-scaling groups, or Kubernetes surface introduced by this module.
- **Deployment unit:** the portal ships inside the existing Legacy.com Spring Boot monolith artifact; it is not a separate service. Jenkins pipeline, AWS deployment mechanism, and session-stickiness behaviour are all inherited.
- **Region / residency:** single-region US, per PRD (Data residency — SaaS B2B Tenant Model).
- **Failover behaviour:** primary→failover transition is tolerated without data loss; in-flight user sessions re-authenticate via existing platform session behaviour (NFR18). No bespoke failover logic in this module.
- **Availability target:** 99.5% monthly (NFR17), inherited from or exceeded by the platform SLO.

_To be validated in step-02 / step-03 against the real Legacy.com platform configuration._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (65 total).** Ten groups: Sign-in & tenant context (FR1–FR7), Connect Custom onboarding (FR58–FR65), Listings lifecycle (FR8–FR17), Billing & invoicing (FR18–FR30), Loyalty (FR31–FR39), Account management (FR40–FR42), Internal operations (FR43–FR47), Notifications (FR48–FR50), Order adjustments (FR51–FR53), Audit & compliance (FR54–FR57). MVP: ~46 FRs. Growth: ~19 FRs. Architecturally, the FR set centres on four state machines (Connect account state, listing lifecycle, invoice state, billing-status tier) plus two strategy-pattern abstractions (Issuing-vs-Tremendous fulfilment; pre-pay vs approved billing).

**Non-Functional Requirements (27 total).** Performance 5 (p95/p99 round-trip targets), Security 7 (SAQ-A perimeter, tenant scoping, webhook signature verification, idempotency, SAST gating), Accessibility 4 (WCAG 2.1 AA, keyboard-operable, axe-core in CI), Reliability 4 (99.5% monthly, failover tolerance, webhook idempotency, crash-recovery without event loss), Integration 3 (SDK/API version pinning, Tremendous fallback feature-complete at MVP, inherited mail sender), Usability 2, Observability 2 (structured logs with event/correlation id; 5xx alerting).

**Scale & Complexity.** Medium-high. Brownfield integration into an existing monolith; bounded multi-tenant (closed funeral-home network); regulated-money integration (Stripe Connect Custom + Billing + Issuing-on-Connected-Account); PCI SAQ-A perimeter; state-machine heavy. No HIPAA, no multi-region, no real-time collaboration, no public acquisition funnel.

- Primary domain: Full-stack web (server-rendered JSP + jQuery + Spring Boot; Stripe as regulated money-mover).
- Complexity level: Medium-high (per PRD classification).
- Estimated architectural components (provisional): ~8 module packages — `onboarding`, `listings`, `billing`, `loyalty`, `cards` (Issuing + Tremendous), `admin`, `audit`, `stripe-gateway`.

### Technical Constraints & Dependencies

**Fixed stack (non-negotiable):** JDK 17 + Spring Boot / JSP + JSTL + jQuery 3.6.1 + jQuery UI + Bootstrap / MySQL + Hibernate / Stripe Java SDK / AWS EC2 primary+failover / Jenkins CI / Snyk SAST / Bitbucket / Playwright E2E.

**Reuse mandates (brownfield):** Legacy.com existing auth/session is the source of truth for identity and tenant; MySQL schema lives in the existing Legacy.com database; deployment via existing Jenkins pipeline in the existing monolith artifact; outbound email via the existing platform mail sender; secrets via existing platform secrets management; scheduled work via the platform's `@Scheduled` or equivalent — no new infrastructure of any kind.

**Architecture-gated assumptions (validate before Sprint 1):**

1. Existing Legacy.com auth exposes funeral-home identity, role, and session-to-tenant mapping in a consumable form. *If missing:* adaptation stories land in MVP.
2. Platform already provides mail sender, feature-flag mechanism, secrets management, and a simple scheduler. *If any missing:* each becomes MVP scope.
3. Money-column convention in the existing codebase. *Inherit if present; impose integer-cents BIGINT if absent.*
4. Platform availability SLO. *Inherit if published; default to NFR17's 99.5% otherwise.*
5. Stripe Connect platform agreement + Services Agreement presentation flow in place. *Commercial/legal prerequisite; not a dev task.*

**Hard perimeter — PCI SAQ-A.** No card PAN, expiry, or CVV may be captured, transmitted, or stored by Legacy.com infrastructure. Any ticket proposing card capture/proxy/cache fails design review. Issuing card details surface only via Stripe ephemeral keys on the client.

**Hard perimeter — KYB data.** Business identity, beneficial owners, tax ID, bank linkage are captured exclusively through Stripe-hosted account-link. Legacy.com code never renders KYB forms.

### Cross-Cutting Concerns Identified

1. **Tenancy enforcement** — every FH-scoped FR (≈55 of 65) filtered by `funeral_home_id` at the repository layer, not only the controller layer. Repository methods that intentionally bypass tenancy (Legacy ops admin) named explicitly (`findAllAcrossTenants`) to stand out in code review.
2. **Connect-state gating** — listing creation, invoice finalisation, Issuing card issuance all check cached Connect account state and fail fast on non-`enabled` accounts (FR41).
3. **Stripe integration contract** — pinned SDK version + pinned Stripe API version (NFR21). Single gateway surface for SDK configuration, webhook signature verification, and outbound idempotency key derivation.
4. **Idempotency layer (bidirectional, persistent, deterministic).** Inbound: `stripe_webhook_event` table short-circuits duplicate event ids. Outbound: every Stripe mutation carries a business-derived idempotency key (e.g., `listing-{id}-create-invoice-item`).
5. **Append-only audit store.** Rejects UPDATE and DELETE. Writes on every accrual, redemption, card lifecycle change, freeze, unfreeze, admin override. Seven-year retention (FR57).
6. **Fulfilment abstraction.** Stripe Issuing and Tremendous implement the same redemption interface; selection is a configuration change, not a code release (NFR22).
7. **Money-handling discipline.** Integer-cents `BIGINT` USD at storage and API boundaries; presentation-only formatting.
8. **Feature-flag posture.** ~19 Growth FRs ship behind flags — tier visuals, Payment Element for pre-pay, auto-advance, dunning, RBAC/chain, adjustments, notifications centre.
9. **Observability contract.** Every webhook event and every 5xx produces a structured log entry with event id / correlation id / tenant context; 5xx triggers alerting via the existing platform infrastructure (NFR26, NFR27).

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web (server-rendered JSP + jQuery + Spring Boot backend; Stripe as regulated money-mover). Domain is brownfield module inside an existing monolith — not a greenfield project.

### Starter Options Considered

The usual `create-*-app` class of starter does not apply. The module deploys inside the existing Legacy.com Spring Boot monolith — there is no `git init` step, and every stack decision a starter would normally make for us is already fixed by the host platform (JDK 17 + Spring Boot + JSP + JSTL + jQuery 3.6.1 + jQuery UI + Bootstrap + MySQL + Hibernate). Introducing a starter-template scaffold would create conflicts with platform conventions, not resolve them.

**Evaluated and rejected:**

| Option | Rejection reason |
|---|---|
| Spring Initializr | Generates a standalone artifact with its own build file and main class. PRD requires this module inside the existing monolith artifact, not alongside it. |
| JHipster | Generates SPA frontend + monitoring + Docker Compose + Liquibase. Violates "no SPA framework," "no new deployment units," "match existing paradigms." |
| Spring Boot + Thymeleaf starter | Modernises the view layer away from JSP. PRD locks JSP + JSTL by name. |
| create-next-app / T3 / Remix / SvelteKit / RedwoodJS / Blitz | SPA or Node-based. PRD rules out every one of them. |
| Stripe Spring Boot samples | Reference-only for SDK usage patterns; not a project scaffold. |

### Selected Starter: Existing Legacy.com Platform

**Rationale for Selection:**

The effective "starter" for this module is the existing Legacy.com codebase itself. The module is a new package inside the existing monolith — it inherits the platform's build, deployment, auth, MySQL schema host, CI pipeline, mail sender, secrets management, scheduler, and asset-bundling approach, per PRD Integration Requirements and Architecture-gated Assumptions.

**Initialisation Command:**

```bash
# No generator command applies. Initialisation is a manual module
# scaffold inside the existing Legacy.com source tree.

# Sprint-1 initialisation story (to be expanded by epics/stories):
#   1. Create new module package at the platform's convention path
#      (package name resolved in step-06 — repository structure).
#   2. Add Stripe Java SDK to the platform's build file, version
#      pinned to match the Stripe API version fixed on the platform
#      Stripe account.
#   3. Add three bootstrap tables via the platform's existing
#      migration mechanism:
#        - stripe_webhook_event (persistent inbound idempotency)
#        - audit_event (append-only; UPDATE/DELETE prohibited)
#        - stripe_connect_account (cached Connect state per FH)
#      (Full schema emerges in step-04.)
#   4. Add webhook controller POST /webhooks/stripe with
#      raw-body preservation, signature verification, and
#      persistent idempotency short-circuit — BEFORE any
#      business feature lands.
#   5. Configure Stripe test keys via existing secrets management;
#      never commit keys.
```

**Architectural Decisions Provided by the "Starter" (existing platform):**

**Language & Runtime:** JDK 17, Spring Boot (version inherited from platform — to confirm in step-04), Java source layout under the platform's existing source root.

**Styling Solution:** Bootstrap (version inherited) + JSP + JSTL templates; jQuery 3.6.1 + jQuery UI 1.13.2 + jQuery Validation 1.19.5 for progressive enhancement. No CSS-in-JS, no Tailwind, no component-framework styling.

**Build Tooling:** Platform's existing build file (Maven or Gradle — to confirm in step-04); no new front-end build pipeline. Asset bundling follows the platform's existing approach.

**Testing Framework:** Platform's existing JUnit + whatever layer the platform uses for integration tests (Spring Test / Testcontainers / in-memory DB — to confirm). Playwright E2E added if not already present; otherwise extends platform's Playwright harness.

**Code Organization:** Controller / Service / Repository layering matching the platform's existing convention exactly — including package-private visibility defaults if that's the platform's style. New module is a package, not a sub-project, under the platform's existing source tree.

**Development Experience:** Inherits the platform's IntelliJ setup, local dev loop, Jenkins CI, Snyk SAST, Bitbucket SCCS, and AWS EC2 deployment. Stripe CLI runs locally for webhook forwarding during dev (matches the prototype's tooling).

**Gating platform-convention validation (first task of Sprint 1):**

Before Sprint-1 feature work, confirm by reading the existing Legacy.com codebase:

- Layering convention (controller/service/repository split; package visibility defaults; base packages).
- Build file and Spring Boot version.
- Migration tool (Liquibase, Flyway, or raw DDL).
- JSP root and static asset root.
- Presence/absence of mail sender, feature-flag mechanism, secrets management, and `@Scheduled`/scheduler capability.
- Money-column convention (inherit if present; adopt integer-cents BIGINT if absent).
- Platform availability SLO (inherit if published; default to NFR17 99.5% otherwise).

**Note:** Module initialisation following the steps above should be the first implementation story. The platform-convention validation is a prerequisite task, not a feature.

## Core Architectural Decisions

### Decision Priority Analysis

**Already decided (not re-debated).** Database: MySQL · ORM: Hibernate · Language: Java 17 · Web framework: Spring Boot + Spring MVC · View: JSP + JSTL · JS: jQuery 3.6.1 + jQuery UI + Bootstrap · Build: platform Maven/Gradle · CI: Jenkins + Snyk · Hosting: AWS EC2 · Secrets: existing platform secrets manager · Mail: existing platform sender · Auth: existing Legacy.com session · Payment rails: Stripe (Connect Custom + Billing + Issuing-on-Connected-Account + Webhooks + Financial Connections) · E2E: Playwright. All locked by PRD / `dev_project_scope.md`.

**Critical decisions (block implementation):** D3 (tenancy mechanism), D6 (inbound idempotency schema), D7 (outbound idempotency key format), D8 (append-only audit), D9 (Connect state cache), D14 (webhook signature verification), D20 (correlation-id propagation), D23 (single StripeClient bean), D31 (webhook endpoint), D37 (platform vs Connected Account model).

**Important decisions (shape architecture):** D2 (money-column), D10 (no cache), D11 (state machines persistence), D12 (authorization), D19 (error envelope), D25 (Stripe.js loading), D26 (invoice-status polling), D27 (validation), D30 (env matrix), D33 (scheduler), D35 (observability schema), D36 (feature flags).

**Architecture-gated (finalise after codebase read):** D1 migration tool · D2 money convention · D4 entity ID strategy · D5 timezone policy · D12 authorization mechanism · D22 API doc convention · D26 AJAX convention · D33 scheduler pattern · D36 feature-flag mechanism · D8 DB GRANT boundary.

**Deferred (post-MVP):** Card-on-file auto-advance (FR27); Payment Element embedded checkout (FR28); dunning console (FR47); multi-user RBAC + chain roll-up (FR5–FR6, FR30); notifications centre + preferences (FR49–FR50); order-adjustment flow (FR51–FR53); NetSuite sync, Issuing spending controls, SMS (Vision).

### Data Architecture

- **D1 Migration tool.** Inherit platform's (Liquibase / Flyway / raw DDL). Gated on codebase read.
- **D2 Money-column convention.** Inherit platform's if present; adopt `BIGINT` cents + `char(3) currency_code='USD'` if absent. Financial-correctness is one of the single permitted overrides on "match existing paradigms."
- **D3 Tenancy enforcement.** Hibernate `@Filter` / `@FilterDef` with `funeral_home_id` parameter, enabled in a `@Component` interceptor bound to the session from the session-resolved FH id. Auto-enabled for every FH-scoped entity. Ops-admin cross-tenant access via named repository methods (`findAllAcrossTenants`). *Fallback if `@Filter` doesn't cover our query surface (native queries / JPQL → native SQL): explicit `funeralHomeId` parameter on every repository method + checkstyle rule to enforce.*
- **D4 Entity ID strategy.** Inherit platform's (likely `Long` auto-increment per Hibernate convention; platform may use UUID). Gated on codebase read.
- **D5 Timestamp + timezone policy.** UTC `TIMESTAMP(6)` in storage; UTC at API boundary; format to US/Eastern at presentation. Inherit platform's existing policy if stricter. Gated on codebase read.
- **D6 Inbound idempotency schema.** `stripe_webhook_event` table: `stripe_event_id` PK, `event_type`, `received_at`, `signature_verified` BOOL, `processed_at` NULL-until-done, `processing_result` ENUM (`ok` / `error` / `short_circuit_duplicate`), `last_error` TEXT, `raw_body_hash`. Short-circuits duplicates by PK lookup; raw-body hash detects event-id collisions with different payloads.
- **D7 Outbound idempotency-key format.** Deterministic, business-derived, namespaced: `listing-{id}-create-invoice-item`, `invoice-{id}-finalize`, `redemption-{id}-issue-card`, `cardholder-fh-{id}`. Key stored on the originating row where applicable so retries remint the same key.
- **D8 Audit table + append-only enforcement.** `audit_event` table: `id` PK, `event_type`, `actor_user_id`, `funeral_home_id` nullable, `subject_type` + `subject_id`, `payload_json`, `occurred_at`. Append-only enforced three ways: (a) DB-level `REVOKE UPDATE, DELETE` on the app user (gated on DB-user separation availability); (b) Hibernate `@Immutable`; (c) no repository method exposing mutation.
- **D9 Connect-account state cache.** `stripe_connect_account`: `funeral_home_id` FK PK, `stripe_account_id`, `state` ENUM (`pending` / `needs_info` / `restricted` / `enabled`), `requirements_due_json`, `last_updated_at`, `last_event_id`. Single place for all gating checks.
- **D10 Caching layer.** None in MVP. No Redis / Memcached. Revisit only if NFR1–NFR5 pressure emerges in pilot.
- **D11 State machines — persistence.** Persist state enum on the entity; transitions only via named service methods; `state_transition` audit row on every write. No Spring Statemachine unless platform already uses it.

### Authentication & Security

- **D12 Authorization mechanism.** Spring Security method annotations (`@PreAuthorize`) matching platform's pattern, or platform's custom annotation. Every endpoint annotated explicitly — no "any authenticated user" default. Gated on codebase read.
- **D13 Column-level encryption.** None in MVP. No card data, no KYB data lands in Legacy MySQL — nothing in scope warrants column encryption.
- **D14 Webhook signature verification.** Stripe Java SDK's `Webhook.constructEvent(rawBody, signature, signingSecret)` in dedicated `StripeWebhookController`. Raw request body preserved before JSON deserialisation via a Servlet filter or custom `HttpMessageConverter`. Signature failure → HTTP 400, alert, never silent.
- **D15 Webhook source allowlist.** Stripe webhook IP ranges on the load-balancer / WAF *if* the platform already supports egress ACLs. Defence-in-depth, not a replacement for signature verification.
- **D16 Secrets handling.** Existing Legacy.com secrets management. Stripe live / test keys + webhook signing secret segregated per-environment; never in source, logs, or error messages (NFR11).
- **D17 Role model.** MVP: `FH_USER` + `LEGACY_OPS_ADMIN`. Growth: FH Admin / FH Ordering / FH Accounts + `CHAIN_ACCOUNTS_MANAGER`. Stored against session-derived user; never passed client-side.

### API & Communication Patterns

- **D18 API style.** Spring MVC controllers returning JSON for AJAX endpoints + JSP for page loads. No OpenAPI spec, no separate gateway, no GraphQL. Internal-only endpoints.
- **D19 Error-handling pattern.** `@ControllerAdvice` with `@ExceptionHandler` producing uniform JSON envelope `{ error: { code, message, correlationId } }` for AJAX; styled error page for full-page errors. Stack traces never rendered (NFR25).
- **D20 Correlation-id propagation.** Servlet filter mints correlation id on every request, stores in MDC, echoes to response header, included in every log line and every Stripe API call's `metadata`.
- **D21 Rate limiting.** None in MVP. Inherit platform's edge rate limiting if present. Outbound Stripe rate limits handled by the SDK's retry/backoff.
- **D22 API documentation.** Inherit platform convention (likely Javadoc + internal wiki). No OpenAPI / Swagger unless platform runs it. Gated on codebase read.
- **D23 Stripe SDK client lifecycle.** Single `StripeClient` Spring bean configured with pinned API version at startup from secrets. All Stripe calls go through this bean — no `new Stripe()` scattered. Single place to pin API version (NFR21) + inject per-env keys.

### Frontend Architecture

- **D24 Page-state pattern.** Full-page JSP render + jQuery AJAX for in-page updates. Server is source of truth; AJAX endpoints return JSON; partial HTML refresh via jQuery + JSP fragments where useful. No client-side routing.
- **D25 Stripe.js loading.** CDN-loaded Stripe.js only on pages that need it: loyalty redemption (ephemeral-keys card reveal), hosted-invoice redirect targets. Not loaded globally.
- **D26 Invoice-status live update.** AJAX poll every 5s on the invoice-status page (matches prototype's convention), *or* a single manual "refresh" control. Decide by codebase convention in step-06; default to poll for demo polish.
- **D27 Form validation.** jQuery Validation 1.19.5 on the client (already in stack) + Spring Bean Validation (`@Valid` + JSR-380) on the server. Server-side authoritative.
- **D28 Accessibility enforcement.** Axe-core (or platform's tool) in Jenkins on every PR; blocks release on new critical violations (NFR16). WCAG 2.1 AA baseline.

### Infrastructure & Deployment

- **D29 Deployment unit.** Single monolith artifact — module ships inside existing Spring Boot WAR/JAR. No separate service.
- **D30 Environment matrix.** Existing platform envs (dev / staging / prod). Stripe test mode in dev + staging; Stripe live mode in prod only. Webhook signing secret and keys differ per env.
- **D31 Webhook endpoint convention.** Single endpoint `POST /webhooks/stripe`, multiplexed in a handler by `event.type` → per-event-type service method. No per-event-type separate URLs.
- **D32 Local webhook forwarding.** Stripe CLI `stripe listen --forward-to localhost:{port}/webhooks/stripe` — matches prototype and CLAUDE.md.
- **D33 Scheduled jobs.** Spring `@Scheduled` for monthly-invoice close-off, auto-advance (Growth), dunning (Growth). Inherit platform's cluster-safe scheduler wrapper if present. Gated on codebase read.
- **D34 Stripe live / test segregation.** Test keys in dev + staging + non-prod demos. Live keys only in prod. Enforced by env-specific secrets; CI refuses to deploy a config pointing non-prod at live keys.
- **D35 Observability stack.** Inherit platform logging + alerting. Fixed structured-log schema for Stripe events: `{ correlationId, stripeEventId, stripeEventType, tenantId, signatureVerified, processingResult, errorCode }`.
- **D36 Feature flags.** Inherit platform's mechanism if present; config-driven boolean `FeatureFlagService` backed by a `feature_flag` table or properties file if absent. Gated on codebase read.
- **D37 Connect platform account vs Connected Accounts.** Platform account issues cards (Issuing controller), verifies platform KYB, holds API credentials. Connected Accounts represent funeral homes (cardholder = FH legal entity; Billing customer-of-record per FH). Platform-level Stripe API calls always carry the `Stripe-Account` header when acting on a Connected Account.

### Decision Impact Analysis

**Implementation sequence (earliest first):**

1. **D20 correlation-id filter + D35 log schema** — land in Sprint 1 before any feature handler so every handler inherits them.
2. **D23 single `StripeClient` bean + D34 env segregation** — startup-time configuration; wrong-env keys become a boot failure, not a runtime one.
3. **D14 webhook signature verification + D6 inbound idempotency + D31 single endpoint** — the webhook foundation. No feature that writes to Stripe lands before this is done.
4. **D3 Hibernate `@Filter` tenancy + D9 Connect-account state cache** — every FH-scoped feature depends on both.
5. **D8 append-only audit + DB GRANT boundary** — audit writes start from Sprint 1 but GRANT separation may need a platform-infra ticket.
6. **D7 outbound idempotency keys** — enforced in every outbound-Stripe service method from first use.
7. **D11 state machines + D19 error envelope + D27 validation** — applied as each feature group lands.
8. **D36 feature flags** — needed before the first Growth FR but not for pure-MVP delivery.

**Cross-component dependencies:**

- **D6 + D7 (bidirectional idempotency)** — every webhook handler reads `stripe_webhook_event` first; every outbound mutation derives its key before the call. Missing either side reintroduces duplicate-processing bugs.
- **D3 Hibernate `@Filter`** — requires every FH-scoped entity annotated with `@FilterDef` + `@Filter`; interceptor activates at session open from session-resolved FH id. Ops admin bypass is the one named exception.
- **D8 append-only audit + DB GRANT** — requires DB user separation: app user has `INSERT` but not `UPDATE/DELETE` on `audit_event`. Platform's user convention gated; worst case we ask infra for a scoped GRANT.
- **D9 Connect cache + D14 signature verify** — onboarding epic depends on both; cache isn't valid until we're handling `account.updated` idempotently.
- **D20 + D35** — land together in Sprint 1 before anything that logs.
- **D23 + D34** — single client bean + per-env secrets means mis-wired env fails at boot, not on first charge.
- **D37 platform vs Connected Accounts** — every Stripe call site must consciously choose platform-context vs connected-account-context; wrong choice creates fund-flow bugs that are invisible until reconciliation.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

Sixteen potential conflict points identified — areas where two engineers (human or AI) could reasonably make different choices. Most non-Stripe decisions resolve to "match platform convention" (confirmed in step-06 by codebase read). The rules below govern where the platform has no prior art: Stripe calls, webhooks, idempotency, audit, tenancy enforcement, money, and state-transition discipline.

### Naming Patterns

**Java packages.** `com.legacy.obituaries.{subdomain}` — one of `onboarding` / `listings` / `billing` / `loyalty` / `cards` / `admin` / `audit` / `stripe` / `common`. Inside each: `SubdomainController`, `SubdomainService`, `SubdomainRepository`, entity classes at package root, DTOs in a `dto` sub-package.

**Classes.** `{Entity}Controller`, `{Entity}Service`, `{Entity}Repository`, `{Entity}` (JPA), `{Action}Request` / `{Action}Response`. Example: `ListingController`, `ListingService`, `ListingRepository`, `Listing`, `CreateListingRequest`, `ListingResponse`.

**Database tables.** Module-prefix **`obituaries_`** on every module table: `obituaries_listing`, `obituaries_invoice`, `obituaries_loyalty_points_event`, `obituaries_audit_event`, `obituaries_stripe_webhook_event`, `obituaries_stripe_connect_account`. Rationale: obvious module data in a shared schema; greppable ops. Confirm / align with platform convention in step-06.

**Columns.** `snake_case`, singular (`funeral_home_id`, `stripe_event_id`, `occurred_at`, `amount_cents`). FK carries the referenced table's singular-form id.

**REST endpoints.** `/{module-base}/{resource-plural}[/{id}][/{action}]` — lowercase kebab-case. Examples: `/obituaries/listings`, `/obituaries/listings/{id}/submit`, `/obituaries/invoices/{id}/download`. **Single exception:** `POST /webhooks/stripe` (not module-prefixed; matches Stripe-configuration simplicity per D31).

**Route parameters.** `{id}` style (Spring MVC default); never `:id`.

**JSP views.** `{module}/{subdomain}/{view}.jsp` (example `obituaries/listings/listingDetail.jsp`).

**JS files.** `{subdomain}-{purpose}.js` (example `listings-form.js`, `loyalty-redeem.js`). One file per page surface; shared helpers in `obituaries-common.js`.

### Structure Patterns

**Bounded-context isolation.** One package per bounded context; cross-package dependencies go through published service interfaces, never reach into internals. Example: `loyalty` depends on `cards.IssuingService` and `cards.TremendousService`, not `cards` internals.

**FH-scoped repositories.** Every FH-scoped repository extends `FhScopedRepository<T>` which wires the Hibernate `@Filter` enablement. Cross-tenant methods are named `findAllAcrossTenants` / `findByIdAcrossTenants` on a sibling `OpsRepository<T>` — never on `FhScopedRepository`. Code review rejects any cross-tenant method without the `AcrossTenants` suffix.

**Tests.** Platform convention for unit + integration location. Playwright E2E specs in `e2e/obituaries/{journey}.spec.ts`, one file per hero journey (Journey 0–5).

### Format Patterns

**JSON field case: `camelCase`.** Inbound + outbound. Keeps Jackson defaults working with the Stripe Java SDK's camelCase Java objects without scattered `@JsonProperty` annotations.

**API response shape.**

```json
{ "data": { ... }, "meta": { "correlationId": "..." } }
```

Collections use `{ "data": [ ... ], "meta": { "correlationId": "...", "total": 42 } }`.

**Error envelope.**

```json
{ "error": { "code": "CONNECT_NOT_ENABLED",
             "message": "Your account is not yet activated.",
             "correlationId": "2026-04-23-abc123" } }
```

**Reserved error codes:** `VALIDATION_FAILED`, `TENANT_FORBIDDEN`, `CONNECT_NOT_ENABLED`, `INVALID_STATE_TRANSITION`, `STRIPE_UPSTREAM_ERROR`, `FEATURE_DISABLED`, `NOT_FOUND`, `UNAUTHENTICATED`, `INTERNAL_ERROR`. New codes need an ADR note.

**Dates in JSON.** ISO-8601 UTC: `2026-04-23T14:30:00Z`. Never epoch milliseconds. UI formats to US/Eastern.

**Booleans.** `true` / `false`; field names affirmative (`isEnabled`, not `disabled`).

**Null handling.** Absent keys equal null on read. On write, explicit `null` is only valid where the DTO marks the field `@Nullable`.

**Money.** Storage `amount_cents BIGINT NOT NULL` + `currency_code CHAR(3) NOT NULL` (`'USD'` only in MVP — constraint- or validator-enforced). API `{ "amountCents": 42000, "currencyCode": "USD" }`. **Never decimal dollars in JSON.** UI formats via a single helper `Money.formatUsd(long cents)` and JSTL tag `<obituaries:money cents="${x}" />`. All arithmetic in `long` cents; presentation divides by 100 as the final step.

### Communication Patterns

**Stripe call-site rules.**

1. **All Stripe calls through `StripeClient` bean.** Never `new Stripe()` or raw `Stripe.apiKey` assignment.
2. **Every Stripe mutation takes a business-derived idempotency key** via `RequestOptions.builder().setIdempotencyKey(...)`. Keys follow D7 format: `listing-{id}-create-invoice-item`, `invoice-{id}-finalize`, `redemption-{id}-issue-card`, `cardholder-fh-{id}`. Never `UUID.randomUUID()` at the call site — retries must remint the same key.
3. **Every call against a Connected Account carries `Stripe-Account`** via `RequestOptions.setStripeAccount(connectAccountId)`. A wrapper `ConnectedAccountStripeClient` takes a `FuneralHome` and auto-sets the header so call sites can't forget. Platform-level calls (creating Connected Accounts, platform-level Issuing cardholders) use the unwrapped `StripeClient`.
4. **Stripe object ids persist in native form** — `stripe_customer_id`, `stripe_invoice_id`, `stripe_account_id`, `stripe_event_id`. Never hashed or shortened. They are audit join keys (FR57).
5. **Never swallow `StripeException`.** Log with correlation id + Stripe request id + event id (if any); rethrow mapped to `STRIPE_UPSTREAM_ERROR` or a translated domain error.

**Webhook handling.**

Flow for `POST /webhooks/stripe`:

1. Filter preserves raw request body before JSON parsing.
2. Controller calls `Webhook.constructEvent(rawBody, signature, signingSecret)` — on failure HTTP 400 + alert.
3. Insert into `obituaries_stripe_webhook_event` with `processing_result='pending'`; PK collision (duplicate `stripe_event_id`) → short-circuit, return 200.
4. Dispatch to `handle{EventType}` via `Map<String, StripeEventHandler>`. Handler names: `handleInvoicePaid`, `handleInvoiceFinalized`, `handleInvoicePaymentFailed`, `handleAccountUpdated`, `handleAccountApplicationDeauthorized`. New types require a new handler + routing-map row — no silent-success fallback for unknown types.
5. On success: update `processed_at`, `processing_result='ok'`. On handler exception: `processing_result='error'`, `last_error=...`, return 500 (Stripe retries).

Handlers are **always idempotent at the business level** (second defence after the webhook PK). Example: `handleInvoicePaid` uses `UPDATE ... WHERE id=? AND status != 'paid'`.

**Audit events.**

Vocabulary (MVP reserved set):

```
listing_drafted · listing_submitted · listing_published · listing_cancelled
invoice_finalized · invoice_paid · invoice_payment_failed
loyalty_points_accrued · loyalty_points_redeemed
connect_account_created · connect_account_updated · connect_account_enabled
issuing_card_issued · issuing_card_status_changed
fh_frozen · fh_unfrozen
admin_override_applied
webhook_signature_failed
```

New event types need an ADR line + add to this list.

**Payload shape.** Always `{ before: {...}, after: {...}, reason: "..." }`. `before`/`after` may be null for create/delete. `reason` is free-text but required.

**Write pattern.** Every state-changing service method calls `auditService.record(...)` as the **last** action before commit. Audit write failure rolls back the whole transaction.

**State transitions.**

One service method per legal transition, verb-named to match the audit event:

```java
public class ListingService {
    public void submitListing(long id) { ... }   // draft → pending
    public void publishListing(long id) { ... }  // upcoming → published
    public void cancelListing(long id) { ... }   // any-non-terminal → cancelled
}
```

Invalid transitions throw `IllegalStateTransitionException` → HTTP 409 + `INVALID_STATE_TRANSITION`. Every transition writes a `state_transition` audit row. **No raw `listing.setStatus(...)` outside the owning service** — enforced by package-private setter or Checkstyle rule.

### Process Patterns

**Tenancy enforcement (recap of D3 as an implementation rule).**

- Every FH-scoped JPA entity annotated `@FilterDef(name="tenant", parameters=@ParamDef(name="fhId", type="long")) @Filter(name="tenant", condition="funeral_home_id = :fhId")`.
- `TenantFilterInterceptor` activates the filter at session open from the session-derived FH id. Ops-admin sessions skip activation.
- Native SQL / JPQL-as-native must manually add `funeral_home_id = :fhId` — Checkstyle forbids `@Query(nativeQuery=true)` without an `fhId` parameter on FH-scoped repositories.

**Logging + observability.**

MDC keys (set by correlation-id filter + per-handler enrichment):

```
correlationId, userId, tenantId, stripeEventId, stripeEventType, stripeRequestId
```

Log levels:

- **ERROR** — webhook signature failure; Stripe 5xx; uncaught handler exception; failed audit write.
- **WARN** — Stripe 4xx we recover from; feature-flag-off bypass of a usually-on path; idempotency short-circuit.
- **INFO** — every webhook received (new or duplicate); every state transition; admin override.
- **DEBUG** — outbound Stripe payloads (non-sensitive fields only).

**Never log:** raw Stripe webhook payloads (possible PII-adjacent data); Stripe secret keys; full stack traces to the UI.

**Feature flags.** Key naming `obituaries.{scope}.{feature}` — `obituaries.billing.auto_advance`, `obituaries.loyalty.tier_progress_bar`, `obituaries.pre_pay.payment_element`, `obituaries.chain.consolidated_csv`. Default off. Read via single `featureFlagService.isEnabled(key)`; never `@Value("${...}")` scattered across services for feature-gating.

**Forms + validation.** Controller binds to a `@Valid` DTO (`@NotBlank`, `@Size(max=200)`, `@Email`, `@Positive`); bean validation fires first. Domain validation lives in services and throws `DomainValidationException` → `VALIDATION_FAILED`. jQuery Validation mirrors client-side for UX; server is authoritative. Field-level errors returned as `{ error: { code: "VALIDATION_FAILED", fields: { email: "Invalid email" } } }`.

### Enforcement Guidelines

**All engineers (human or AI) touching this module MUST:**

1. Route all Stripe calls through `StripeClient` / `ConnectedAccountStripeClient`.
2. Derive idempotency keys from business ids + operation name.
3. Write an audit row for every state-changing service method.
4. Use `FhScopedRepository<T>` for FH-scoped entities; name cross-tenant methods with `AcrossTenants`.
5. Persist money as `amount_cents BIGINT + currency_code CHAR(3)`; format only at presentation.
6. Add every new webhook event type to the routing map *and* write an idempotent handler — no silent unknown-type 200.
7. Use reserved error codes; new codes need an ADR.
8. Set MDC `correlationId` on every request; log structured.
9. Feature-gate Growth features via `FeatureFlagService.isEnabled(key)`.

**Pattern enforcement tooling:**

- **Checkstyle / ArchUnit** (whichever platform uses) — package boundaries, no raw `Stripe.apiKey`, no native-query methods without `fhId` on FH-scoped repos, no `setStatus` calls outside the owning service.
- **Snyk SAST** — gates every PR (NFR12).
- **Playwright E2E** — hero journeys covering Stripe test-mode end-to-end.
- **Code-review checklist** for every PR touching Stripe — idempotency key derivation, webhook handler idempotency, audit row, tenant scoping.

### Pattern Examples

**Good:**

```java
// Creates an invoice line item idempotently; retries remint the same key
stripeClient.invoiceItems().create(
    InvoiceItemCreateParams.builder()
        .setCustomer(listing.getFuneralHome().getStripeCustomerId())
        .setAmount(listing.getAmountCents())
        .setCurrency("usd")
        .setDescription("Obituary: " + listing.getDeceasedName())
        .build(),
    RequestOptions.builder()
        .setIdempotencyKey("listing-" + listing.getId() + "-create-invoice-item")
        .setStripeAccount(listing.getFuneralHome().getStripeConnectAccountId())
        .build()
);
auditService.record("invoice_item_created", "listing", listing.getId(),
    null, itemSnapshot(listing), "monthly aggregation batch");
```

**Anti-patterns (code review auto-reject):**

```java
// Raw Stripe.apiKey usage
Stripe.apiKey = System.getenv("STRIPE_KEY");

// Random idempotency key — retries would create duplicates
.setIdempotencyKey(UUID.randomUUID().toString())

// Forgetting Stripe-Account header when acting on a Connected Account
stripeClient.invoices().create(params);  // missing RequestOptions.setStripeAccount

// Decimal dollars in DB or JSON
amount DECIMAL(10,2)
{ "amount": 420.00 }

// Direct status mutation bypassing state machine
listing.setStatus("published");  // must be listingService.publishListing(id)

// Native query without tenant scope on an FH-scoped repository
@Query(nativeQuery = true, value = "SELECT * FROM obituaries_listing WHERE id = :id")

// Silent unknown-event-type
if (!handlers.containsKey(event.getType())) return ResponseEntity.ok().build();
```

## Project Structure & Boundaries

### FR → Package Mapping

| FR group | FR range | Package | Notes |
|---|---|---|---|
| Sign-in & tenant context | FR1–FR7 | `common.tenant` + platform | Auth inherited; `TenantResolverService` + `TenantFilterInterceptor` local |
| Connect Custom onboarding | FR58–FR65 | `onboarding` | Connect account lifecycle, account-link generation, state-cache updates |
| Listings lifecycle | FR8–FR17 | `listings` | Entity, state machine, per-newspaper pricing |
| Billing & invoicing | FR18–FR30 | `billing` | Monthly aggregation, invoice creation, webhook handlers for `invoice.*` |
| Order adjustments | FR51–FR53 (Growth) | `billing.adjustments` | Price-change notification + credit-note / line-correction |
| Loyalty | FR31–FR39 | `loyalty` | Points accrual + history + tier logic |
| Redemption fulfilment | FR34–FR36 | `cards` | Issuing + Tremendous strategies behind one interface |
| Account management | FR40–FR42 | `onboarding` (upgrade) + `admin` (freeze view) | Small; no dedicated package |
| Internal operations | FR43–FR47 | `admin` | Service Fees, freeze/unfreeze, overdue queue, simulated-error toggle |
| Notifications | FR48–FR50 | `notifications` | Email sender wrapper + templates; in-portal centre (Growth) |
| Audit & compliance | FR54–FR57 | `audit` | Append-only writer; supports all other packages |
| Cross-cutting Stripe concerns | — | `stripe` | `StripeClient`, `ConnectedAccountStripeClient`, `StripeWebhookController`, idempotency, Connect-account read |

### Complete Module Tree

```
# Placeholder paths — finalise during Sprint-1 platform-convention validation:
#   {platform-src-root}      — likely src/main/java/
#   {platform-resources-root} — likely src/main/resources/
#   {platform-jsp-root}      — likely src/main/webapp/WEB-INF/views/ or similar
#   {platform-static-root}   — likely src/main/webapp/static/ or similar
#   {platform-migrations-dir} — likely src/main/resources/db/migration/ (Flyway)
#                               or src/main/resources/db/changelog/ (Liquibase)

{platform-src-root}/com/legacy/obituaries/
├── onboarding/
│   ├── OnboardingController.java          # FR58, FR59, FR61, FR62, FR64, FR65
│   ├── OnboardingService.java             # FR58, FR59, FR60, FR61, FR62, FR65
│   ├── OnboardingRepository.java          # reads funeral_home + stripe_connect_account
│   ├── ConnectAccountStateService.java    # FR63 (webhook handler for account.updated)
│   ├── UpgradePathwayService.java         # FR42 (Growth)
│   └── dto/
│       ├── InitiateOnboardingRequest.java
│       ├── ResendAccountLinkRequest.java
│       ├── ConnectAccountStateResponse.java
│       └── UpgradeEligibilityResponse.java
│
├── listings/
│   ├── ListingController.java             # FR8–FR14
│   ├── ListingService.java                # state machine: submitListing, publishListing, cancelListing
│   ├── ListingRepository.java             # extends FhScopedRepository<Listing>
│   ├── ListingOpsRepository.java          # cross-tenant methods for admin package
│   ├── Listing.java                       # entity; @FilterDef("tenant")
│   ├── ListingStatus.java                 # enum: DRAFT, PENDING, UPCOMING, PUBLISHED, CANCELLED
│   ├── NewspaperCatalog.java              # static + DB-backed per-newspaper pricing
│   ├── BillingPartnerRouter.java          # FR10 billing-partner vs direct-invoice logic
│   └── dto/
│       ├── CreateListingRequest.java
│       ├── UpdateListingRequest.java
│       ├── ListingResponse.java
│       └── NewspaperPriceQuoteResponse.java
│
├── billing/
│   ├── InvoiceController.java             # FR19–FR22, FR26
│   ├── InvoiceService.java                # FR18, FR23, FR25 (monthly aggregation + pre-pay)
│   ├── InvoiceRepository.java             # extends FhScopedRepository<Invoice>
│   ├── InvoiceOpsRepository.java          # FR45 overdue queue (cross-tenant)
│   ├── Invoice.java                       # entity
│   ├── InvoiceStatus.java                 # enum: DRAFT, FINALIZED, OPEN, PAID, UNCOLLECTIBLE, VOID
│   ├── MonthlyCloseScheduler.java         # @Scheduled — monthly finalise pass
│   ├── InvoicePdfService.java             # FR21, FR22 — proxies Stripe hosted PDF
│   ├── BulkInvoiceExportService.java      # FR22 zip + _summary.csv
│   ├── CartService.java                   # FR26 multi-invoice cart drawer
│   ├── handlers/
│   │   ├── InvoiceFinalizedHandler.java   # FR24
│   │   ├── InvoicePaidHandler.java        # FR24, FR25
│   │   └── InvoicePaymentFailedHandler.java
│   ├── adjustments/                        # Growth — FR51–FR53
│   │   ├── AdjustmentService.java
│   │   ├── AdjustmentController.java
│   │   └── dto/
│   └── dto/
│       ├── InvoiceResponse.java
│       ├── InvoiceListResponse.java
│       ├── CartAddRequest.java
│       └── PayInvoiceResponse.java
│
├── loyalty/
│   ├── LoyaltyController.java             # FR32, FR33, FR34
│   ├── LoyaltyService.java                # FR31 (accrual), FR34 (redemption orchestration)
│   ├── LoyaltyRepository.java             # extends FhScopedRepository
│   ├── LoyaltyPointsEvent.java            # append-style points ledger
│   ├── LoyaltyTier.java                   # enum: BRONZE, SILVER, GOLD
│   ├── TierCalculator.java                # FR32 tier from balance
│   └── dto/
│       ├── LoyaltyBalanceResponse.java
│       ├── LoyaltyHistoryResponse.java
│       └── RedeemRequest.java
│
├── cards/
│   ├── CardController.java                # FR35, FR36
│   ├── RedemptionService.java             # orchestrates fulfilment
│   ├── FulfilmentStrategy.java            # interface — switchable backend per NFR22
│   ├── IssuingFulfilmentStrategy.java     # Stripe Issuing on Connected Account
│   ├── TremendousFulfilmentStrategy.java  # Tremendous fallback
│   ├── FulfilmentSelector.java            # reads config to pick strategy at runtime
│   ├── CardRepository.java                # extends FhScopedRepository<RedeemedCard>
│   ├── RedeemedCard.java                  # stripe_card_id + remaining balance snapshot
│   ├── EphemeralKeyService.java           # FR35 — mints Stripe ephemeral keys for card reveal
│   └── dto/
│       ├── RedeemedCardResponse.java
│       └── EphemeralKeyResponse.java
│
├── admin/
│   ├── AdminController.java               # FR43–FR46, FR64
│   ├── ServiceFeesService.java            # FR43 read-only roll-up
│   ├── FreezeService.java                 # FR44 freeze/unfreeze with audit
│   ├── OverdueQueueService.java           # FR45 cross-tenant view
│   ├── SimulatedErrorToggleService.java   # FR46 non-prod only; gated by env check
│   ├── StripeDashboardLinkService.java    # FR64 deep-link generation
│   ├── DunningConsole.java                # FR47 (Growth)
│   └── dto/
│
├── notifications/
│   ├── EmailSenderFacade.java             # wraps existing Legacy.com mail sender
│   ├── EmailTemplates.java                # FR48 MVP templates
│   ├── NotificationCenterService.java     # FR49 (Growth) — in-portal
│   ├── PreferenceCenterService.java       # FR50 (Growth) — opt-outs
│   └── dto/
│
├── audit/
│   ├── AuditService.java                  # write-only API; called by all state-changing services
│   ├── AuditEvent.java                    # entity; @Immutable
│   ├── AuditEventType.java                # reserved vocabulary enum
│   └── AuditRepository.java               # INSERT-only; DB GRANT enforces
│
├── stripe/
│   ├── StripeClient.java                  # single-bean platform-level client (D23)
│   ├── ConnectedAccountStripeClient.java  # wrapper that auto-sets Stripe-Account header
│   ├── StripeClientConfig.java            # @ConfigurationProperties; pinned API version
│   ├── StripeWebhookController.java       # POST /webhooks/stripe — single endpoint (D31)
│   ├── RawBodyPreservingFilter.java       # Servlet filter for signature verification
│   ├── IdempotencyKeys.java               # static helpers: forListingInvoiceItem(id), etc.
│   ├── StripeEventHandler.java            # interface
│   ├── StripeEventRouter.java             # Map<String, StripeEventHandler>
│   ├── StripeWebhookEvent.java            # entity (idempotency table)
│   ├── StripeWebhookEventRepository.java
│   ├── StripeConnectAccount.java          # entity (Connect state cache)
│   ├── StripeConnectAccountRepository.java
│   └── handlers/
│       ├── AccountUpdatedHandler.java     # delegates to onboarding.ConnectAccountStateService
│       └── AccountApplicationDeauthorizedHandler.java
│
└── common/
    ├── tenant/
    │   ├── TenantResolverService.java     # session → funeral_home_id
    │   ├── TenantFilterInterceptor.java   # Hibernate session-open hook (D3)
    │   ├── FhScopedRepository.java        # base interface — auto-enables @Filter
    │   └── OpsRepository.java             # base interface — cross-tenant, suffix convention
    ├── money/
    │   ├── Money.java                     # formatUsd(long cents) — single helper
    │   └── MoneyTag.java                  # JSTL tag <obituaries:money>
    ├── error/
    │   ├── ApiError.java                  # uniform JSON envelope DTO
    │   ├── ErrorCode.java                 # reserved enum (D19)
    │   ├── GlobalExceptionHandler.java    # @ControllerAdvice
    │   ├── DomainValidationException.java
    │   ├── IllegalStateTransitionException.java
    │   ├── TenantForbiddenException.java
    │   └── ConnectNotEnabledException.java
    ├── logging/
    │   ├── CorrelationIdFilter.java       # MDC set per request
    │   └── StructuredLogFields.java       # MDC key constants
    ├── featureflag/
    │   ├── FeatureFlagService.java        # single read API
    │   └── FeatureFlagKey.java            # key-naming constants
    └── config/
        └── ObituariesModuleConfig.java    # @Configuration — wires interceptors, filters
```

### JSP + static asset tree

```
{platform-jsp-root}/obituaries/
├── dashboard/dashboard.jsp                 # FR40 + Journey 1 landing
├── onboarding/
│   ├── requirementsDue.jsp                 # FR62 banner + resume link (FH-facing)
│   └── upgradeEligibility.jsp              # FR42 (Growth)
├── listings/
│   ├── listingList.jsp
│   ├── listingForm.jsp                     # FR8–FR13 single-form (wizard in Growth)
│   └── listingDetail.jsp
├── billing/
│   ├── invoiceList.jsp
│   ├── invoiceDetail.jsp
│   └── cart.jsp                            # FR26
├── loyalty/
│   ├── loyaltyDashboard.jsp                # FR32, FR33
│   └── redeemFlow.jsp                      # FR34–FR35
├── cards/myCards.jsp                       # FR36
├── admin/
│   ├── adminHome.jsp
│   ├── serviceFees.jsp                     # FR43
│   ├── overdueQueue.jsp                    # FR45
│   └── funeralHomeDetail.jsp               # FR44, FR64, FR65
└── fragments/
    ├── connectStatusBanner.jsp              # FR61/FR62 — reused across pages
    ├── freezeBanner.jsp                     # FR41
    └── money.tag                            # JSTL money formatter

{platform-static-root}/obituaries/
├── js/
│   ├── obituaries-common.js                # correlation id echo, money helper
│   ├── onboarding-status.js
│   ├── listings-form.js                    # jQuery Validation wiring
│   ├── billing-cart.js
│   ├── billing-invoice-poll.js              # FR19 AJAX status poll (D26)
│   ├── loyalty-redeem.js                   # Stripe.js for ephemeral-keys card reveal
│   └── admin-freeze.js
├── css/obituaries.css                       # module-local overrides on Bootstrap
└── img/obituaries/                          # logos, empty-state illustrations
```

### Migrations tree

```
{platform-migrations-dir}/obituaries/
├── V{N}__obituaries_stripe_webhook_event.sql    # D6
├── V{N+1}__obituaries_audit_event.sql           # D8 — includes REVOKE UPDATE/DELETE if infra allows
├── V{N+2}__obituaries_stripe_connect_account.sql  # D9
├── V{N+3}__obituaries_funeral_home_extensions.sql # stripe_connect_account_id + billing_status_tier
├── V{N+4}__obituaries_listing.sql
├── V{N+5}__obituaries_invoice.sql
├── V{N+6}__obituaries_invoice_line_item.sql
├── V{N+7}__obituaries_loyalty_points_event.sql
├── V{N+8}__obituaries_redeemed_card.sql
└── V{N+9}__obituaries_state_transition.sql      # generic state-machine audit
```

Version numbering follows platform's convention; prefix format resolved in Sprint-1 validation.

### Test tree

```
{platform-test-root}/com/legacy/obituaries/
├── onboarding/
│   ├── OnboardingServiceTest.java
│   └── ConnectAccountStateServiceTest.java
├── billing/
│   ├── InvoiceServiceTest.java
│   ├── MonthlyCloseSchedulerTest.java
│   └── handlers/
│       ├── InvoicePaidHandlerTest.java        # idempotency on replay
│       └── InvoicePaymentFailedHandlerTest.java
├── listings/
│   └── ListingServiceStateMachineTest.java
├── loyalty/
│   ├── LoyaltyServiceAccrualTest.java         # accrual trigger: paid/published, not placed
│   └── TierCalculatorTest.java
├── cards/
│   ├── IssuingFulfilmentStrategyTest.java
│   ├── TremendousFulfilmentStrategyTest.java
│   └── FulfilmentSelectorTest.java
├── stripe/
│   ├── StripeWebhookControllerTest.java       # CLAUDE.md mandate: signature verification
│   ├── StripeWebhookControllerIdempotencyTest.java
│   ├── RawBodyPreservingFilterTest.java
│   └── ConnectedAccountStripeClientTest.java  # Stripe-Account header always set
└── common/
    ├── tenant/
    │   └── TenantFilterInterceptorTest.java   # cross-tenant leak prevention
    └── money/
        └── MoneyTest.java

e2e/obituaries/
├── journey0-onboarding.spec.ts
├── journey1-diane-happy-path.spec.ts           # FR8–FR14, FR31, FR34, FR35
├── journey2-diane-freeze-recovery.spec.ts
├── journey3-marcus-chain.spec.ts               # Growth
├── journey4-sam-pre-pay-upgrade.spec.ts
└── journey5-priya-ops.spec.ts
```

### Architectural Boundaries

**API boundaries.**

- Public (FH-facing) endpoints: `/obituaries/*` — auth + tenant required on every route; JSON for AJAX, HTML for page loads.
- Admin (ops-facing) endpoints: `/obituaries/admin/*` — require `LEGACY_OPS_ADMIN` role; cross-tenant allowed.
- Webhook endpoint: `/webhooks/stripe` — Stripe calls it; signature-verified; no session auth. Single exception to module-prefix naming (D31).
- No external API surface. Third parties (NetSuite, newspapers) integrate via Stripe connectors or separate modules.

**Component boundaries.**

- Each subdomain package owns its entities, services, repositories, controllers, and DTOs.
- Cross-package collaboration via published service interfaces only — never by importing another package's repository or entity internals.
- Allowed: `billing.InvoicePaidHandler` calls `listings.ListingService.publishListing(id)` and `loyalty.LoyaltyService.accruePoints(invoiceId)`.
- Disallowed: `billing.InvoiceService` calls `loyalty.LoyaltyRepository` directly.
- Enforced by ArchUnit / Checkstyle rules in CI.

**Service boundaries.**

- `AuditService`, `FeatureFlagService`, `TenantResolverService`, `EmailSenderFacade` are single-entry points with no sibling callers.
- `StripeClient` and `ConnectedAccountStripeClient` are the only Stripe-SDK entry points; no `import com.stripe.*` anywhere else.

**Data boundaries.**

- FH-scoped entities (listings, invoices, loyalty, cards, connect_account, FH-scoped audit) carry `funeral_home_id`; repositories enforce tenancy via Hibernate `@Filter`.
- Platform-scoped entities (webhook-event idempotency, service-fees roll-up reads, admin-scope audit) live under `stripe` and `admin` packages, queried via `OpsRepository<T>`.
- Schema ownership: every module table is `obituaries_*`. The module does not read or write any non-`obituaries_*` table directly; platform tables accessed via platform-published service interfaces.

### Integration Points

**Internal (within the module):**

- Webhook → handler routing via `StripeEventRouter` (single routing map).
- State-change → audit via `AuditService` (single write API, last call before commit).
- Tenancy → repository via `FhScopedRepository` base + Hibernate `@Filter`.
- Feature-gating → single `FeatureFlagService` read.

**External (outside the module):**

- Stripe (Connect Custom + Billing + Payment Intents + Issuing + Financial Connections + Webhooks) — confined to `stripe` package + designated handler classes.
- Legacy.com auth + session — via `TenantResolverService` only.
- Legacy.com mail sender — via `EmailSenderFacade` only.
- Platform secrets, feature-flag mechanism, `@Scheduled`, MySQL — inherited; wiring lives in `ObituariesModuleConfig`.
- Tremendous (fallback fulfilment) — via `TremendousFulfilmentStrategy` behind `FulfilmentStrategy` interface.

### Data Flow — Critical Paths

**Order → invoice → publish (Journey 1 MVP):**

```
FH user submits listing (JSP + jQuery)
  → ListingController.create()
  → ListingService.submitListing()
    → tenant filter applied, Connect-state check
    → Listing persisted (DRAFT → PENDING)
    → audit: listing_submitted
  → queued for monthly aggregation
  → MonthlyCloseScheduler (D33)
    → InvoiceService.closeMonth(fhId)
      → ConnectedAccountStripeClient.invoices().finalizeInvoice(...)
        idempotency key `invoice-{id}-finalize`
      → audit: invoice_finalized
  → Stripe sends `invoice.paid` webhook
  → StripeWebhookController
    → signature verify → webhook_event insert (idempotent)
    → InvoicePaidHandler
      → InvoiceService.markPaid(invoiceId)
      → ListingService.publishInvoiceListings(invoiceId)
        → UPCOMING → PUBLISHED; audit: listing_published per listing
      → LoyaltyService.accrueFor(invoiceId)
        → points ledger row; audit: loyalty_points_accrued
```

**Onboarding (Journey 0 MVP):**

```
Legacy ops initiates (POST /obituaries/admin/onboarding)
  → OnboardingService.initiate(fhDetails)
    → StripeClient.accounts().create(custom, country, email)
      idempotency key `fh-create-{legacyFhId}`
    → StripeConnectAccount row persisted (state=pending)
    → account-link generated
    → EmailSenderFacade.send(onboardingInvite)
    → audit: connect_account_created
FH completes hosted KYB; Stripe sends account.updated
  → AccountUpdatedHandler
    → ConnectAccountStateService.applyStateUpdate(event)
      → cache updated
      → if newly enabled: welcome email, audit: connect_account_enabled
      → if newly restricted: ops alert
```

**Redemption (Journey 1 climax):**

```
FH user taps Redeem
  → CardController.createRedemption()
  → RedemptionService.redeem(fhId, points, rewardSpec)
    → LoyaltyService.debit(fhId, points) [audit: loyalty_points_redeemed]
    → FulfilmentSelector.strategy()
        (Issuing if enabled; Tremendous if flag-switched)
    → IssuingFulfilmentStrategy
      → ConnectedAccountStripeClient.issuing.cardholders().create(...)
        idempotency key `cardholder-fh-{id}` (or reuse cached cardholder)
      → ConnectedAccountStripeClient.issuing.cards().create(...)
        idempotency key `redemption-{id}-issue-card`
    → audit: issuing_card_issued
    → EphemeralKeyService.mint(cardId) → returned to client
  → Browser: Stripe.js reveals full card details
```

### File Organization Patterns

**Configuration.** Single `ObituariesModuleConfig` `@Configuration` class under `common.config` wires interceptors, filters, `@ControllerAdvice` scanning, and module-local beans. No scattered `@Configuration` classes.

**Source organisation.** Vertical slice per subdomain package; shared cross-cutting infrastructure in `common`; shared Stripe concerns in `stripe`. No "utils" or "helpers" dumping grounds.

**Test organisation.** Mirror the source package structure under `{platform-test-root}/com/legacy/obituaries/`; Playwright E2E under repo-root `e2e/obituaries/`, one spec per hero journey.

**Asset organisation.** Module-prefixed under `{platform-static-root}/obituaries/{js|css|img}` — never alongside platform-owned assets. JSP templates mirrored under `{platform-jsp-root}/obituaries/`.

### Development Workflow Integration

**Dev server.** Platform's existing dev loop (IntelliJ run / Tomcat / Spring Boot dev mode — inherited). Module classes reload with the rest of the platform. For webhook testing: `stripe listen --forward-to localhost:{platform-port}/webhooks/stripe`.

**Build.** Module compiles inside the platform's existing Maven/Gradle build; tests run as part of the platform test suite. No separate build step. Snyk SAST scans the combined artifact.

**Deployment.** Module ships inside the platform's existing monolith artifact via the existing Jenkins pipeline to AWS EC2 primary+failover. No separate deployment unit.

### Platform-Root Placeholders to Resolve in Sprint 1

- `{platform-src-root}` — Java source root (likely `src/main/java`)
- `{platform-resources-root}` — resources root (likely `src/main/resources`)
- `{platform-jsp-root}` — JSP root (varies widely by platform)
- `{platform-static-root}` — static-asset root (varies widely)
- `{platform-migrations-dir}` — migration tool directory (Liquibase vs Flyway vs other)
- `{platform-test-root}` — test source root (likely `src/test/java`)
- Version-prefix format on migration files (Flyway `V{N}__` vs Liquibase xml/yaml)

## Architecture Validation Results

### Coherence Validation

**Decision compatibility:** All 37 architectural decisions (D1–D37) are internally consistent. Potential friction points stress-tested:

- D3 Hibernate `@Filter` vs native queries — explicit fallback (`fhId` parameter on native queries + Checkstyle rule on FH-scoped repositories).
- D8 append-only audit + transactional rollback on audit failure — both inside one `@Transactional` scope; audit write as the last action pre-commit works cleanly.
- D23 single `StripeClient` bean + D37 platform vs Connected Account — `ConnectedAccountStripeClient` wrapper resolves this; call sites choose explicitly which bean to inject.
- D6 inbound idempotency + D31 single webhook endpoint + D37 event sources — one endpoint handles both platform-originated and Connected-Account-originated events (see Critical Gap 1 below).
- D11 state machines + D8 audit — every transition writes a `state_transition` audit row; compatible by construction.
- D14 raw-body preservation + Spring Boot JSON parsing — achievable via a custom Servlet filter or `AbstractHttpMessageConverter` override.

**Pattern consistency:** Naming conventions align across packages, tables, URLs, and assets (module-prefixed `obituaries_*` / `/obituaries/*` / `com.legacy.obituaries.*`). Single webhook endpoint is the one deliberate exception. Error codes match the error envelope shape. Idempotency-key format is uniform.

**Structure alignment:** Package boundaries enforce cross-cutting concern ownership (AuditService, FeatureFlagService, StripeClient, EmailSenderFacade as single entry points). Test tree mirrors source tree. Migrations live under `{platform-migrations-dir}/obituaries/`.

### Requirements Coverage Validation

**Functional Requirements:** All 65 FRs have explicit architectural support. Load-bearing spot-checks:

| FR | Covered by |
|---|---|
| FR3 (tenant scoping) | D3 + `FhScopedRepository<T>` + `TenantFilterInterceptor` |
| FR31 (accrual trigger: paid/published, not placement) | `LoyaltyService.accrueFor(invoiceId)` hooked from `InvoicePaidHandler` |
| FR35 (ephemeral-keys card reveal) | `EphemeralKeyService` + D25 Stripe.js on redemption page only |
| FR41 (frozen *or* non-enabled gating) | `ListingService` + `InvoiceService` + `CardService` check both billing-status and Connect state |
| FR54 (append-only audit) | D8 triple-defence (DB GRANT + `@Immutable` + repository interface) |
| FR55 (deterministic outbound idempotency) | D7 + `IdempotencyKeys` helpers |
| FR56 (inbound idempotency short-circuit) | D6 `stripe_webhook_event` + PK collision short-circuit |
| FR57 (7-year retention, reproducible from Stripe ids) | D8 audit schema + Stripe-native-id columns on money-affecting entities |
| FR58–FR65 (Connect Custom onboarding) | `onboarding` package complete; `AccountUpdatedHandler` in `stripe.handlers`; `StripeDashboardLinkService` in `admin` |

**Non-Functional Requirements:** All 27 NFRs addressed:

| NFR | Addressed by |
|---|---|
| NFR1–NFR5 (performance) | Architectural support in place (no-SPA, indexed FH-scoped queries, async webhook processing); targets are a verification task |
| NFR6 (no card data) | D14 hosted surfaces + D25 Stripe.js for card reveal only |
| NFR7–NFR8 (auth + tenant) | D3 + D12 + every-endpoint explicit-annotation rule |
| NFR9 (signature verification) | D14 |
| NFR10 (outbound idempotency keys) | D7 |
| NFR11 (no secrets exposed) | D16 + logging rules |
| NFR12 (Snyk zero critical) | D28 release gate |
| NFR13–NFR16 (accessibility) | D28 axe-core in CI + WCAG 2.1 AA |
| NFR17–NFR18 (availability + failover) | Inherited platform SLO + platform failover |
| NFR19–NFR20 (duplicate + crash-recovery) | D6 `processed_at` state |
| NFR21 (SDK + API pinning) | D23 `StripeClient` bean + `StripeClientConfig` |
| NFR22 (Tremendous fallback) | `FulfilmentStrategy` + `FulfilmentSelector` + D36 feature flag |
| NFR23 (inherit mail sender) | `EmailSenderFacade` |
| NFR24–NFR25 (usability + plain-English errors) | D19 error envelope |
| NFR26–NFR27 (structured log + 5xx alerts) | D20 + D35 + inherited platform alerting |

### Implementation Readiness Validation

**Decision completeness:** All critical decisions (D1–D37) documented with rationale and cross-references to PRD FRs / NFRs. Architecture-gated decisions flagged for Sprint-1 codebase-read validation.

**Structure completeness:** Module tree complete with `{platform-*}` placeholders for the six platform-owned roots (source, resources, JSP, static, migrations, test). Every FR group mapped to its owning package.

**Pattern completeness:** Sixteen conflict points identified and ruled on (naming, structure, format, communication, process). Enforcement tooling specified (ArchUnit / Checkstyle / Snyk / Playwright / code-review checklist).

### Gap Analysis

**Critical gaps (resolve before Sprint 1 via architecture-note addenda):**

1. **Webhook event source distinction.** `StripeEventHandler.handle(Event)` signature must surface `event.account` so handlers act in the correct Connected-Account context using `ConnectedAccountStripeClient`. Bake into the interface so it can't be skipped.
2. **Connect account state reconciliation.** Add a daily `@Scheduled` reconciliation job pulling active Connected Accounts via Stripe API and comparing to cached state; ops alert on divergence. Covers lost-webhook and cohort-migration scenarios.
3. **Charge pattern — direct vs destination.** Default assumption: **direct charges on the Connected Account** with the FH as the Stripe Customer; Legacy.com takes an application fee for billing-partner listings (feeds FR43 Service Fees). Aligns with Issuing-on-Connected-Account and per-FH 1099-K. Needs explicit architecture note + Stripe-integration confirmation.
4. **`funeral_home` table ownership.** Default: **extend the existing Legacy.com `funeral_home` table** with new columns (`stripe_connect_account_id`, `billing_status_tier`) via `V{N+3}__obituaries_funeral_home_extensions.sql`. Arch-gated on platform's FH table name + foreign-module column policy; fallback is a module-owned table FK-linked to the platform FH.

**Important gaps (address during implementation):**

5. **Monthly-close time zone.** Pin `MonthlyCloseScheduler` to `America/New_York` per D5 (`@Scheduled(cron = "0 0 1 1 * *", zone = "America/New_York")`) so invoice month boundaries are deterministic.
6. **Concurrent webhook delivery across replicas.** On PK collision, return 200 unconditionally — don't read `processed_at` (may still be pending on the other replica). Already covered by D6 design; note to pattern docs.
7. **CCPA DSAR surface.** DSAR export = query audit + read platform user record. DSAR delete = redact name/email in `audit_event` via a single named admin operation on `OpsRepository` that preserves the append-only invariant for the rest of the row.
8. **Stripe API version upgrade process.** Bump on dedicated branch → full Playwright E2E + webhook idempotency tests in staging against new version in Stripe-Dashboard test clone → roll forward to prod only after green. Quarterly review cadence per NFR21.

**Nice-to-have gaps (follow-up stories):**

9. **Monitoring metrics.** Specific metrics to surface: `webhook_processing_duration_p99`, `stripe_upstream_error_rate_by_endpoint`, `connect_account_stuck_in_pending_count`, `issuing_redemption_latency_p95`, `monthly_close_outcome_per_fh`. Defer to SRE follow-up.
10. **Stripe-outage degraded mode.** Read surfaces continue to work; mutations fail cleanly with `STRIPE_UPSTREAM_ERROR`; maintenance banner surfaces. Runbook item, not a dev task.
11. **DB connection pool sizing.** Verify platform pool accommodates concurrent webhook processing. Ops validation, not architecture.

### Architecture Completeness Checklist

- [x] Project context thoroughly analysed
- [x] Scale and complexity assessed (medium-high; brownfield)
- [x] Technical constraints identified (stack locked; PCI SAQ-A perimeter)
- [x] Cross-cutting concerns mapped (9 concerns, all with owners)
- [x] Critical decisions documented with rationale (37 decisions)
- [x] Technology stack fully specified
- [x] Integration patterns defined (Stripe call-site rules, webhook flow, audit pattern)
- [x] Performance considerations addressed
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements-to-structure mapping complete

### Architecture Readiness Assessment

**Overall status:** READY FOR IMPLEMENTATION, subject to three gating items:

1. Resolving Critical Gaps 1–4 via architecture-note addenda before Sprint 1.
2. Completing platform-convention validation tasks as Sprint-1 prerequisite work.
3. Resolving architecture-gated assumptions from PRD §Outstanding Assumptions (auth consumability, four platform capabilities, money convention, availability SLO) + Stripe Connect platform agreement prerequisite.

**Confidence level:** HIGH for MVP delivery, conditional on those three gating items.

**Key strengths:**

- Foundational Stripe decisions (Connect Custom, Issuing-on-Connected-Account, persistent bidirectional idempotency) match PRD compliance + correctness demands.
- Cross-cutting concerns each have a single enforcement mechanism — no accidental duplication.
- Brownfield stance consistent throughout: platform conventions inherited; new module is a clean package.
- Fulfilment abstraction (Issuing ↔ Tremendous) config-switchable per NFR22 — protects against Stripe Issuing approval slippage.
- Webhook handling defensive by construction: raw-body preservation, signature verification, PK-collision short-circuit, business-level idempotency, structured logs — five independent defences on the highest-risk code path.

**Areas for future enhancement (post-MVP):**

- Spring Statemachine framework if state machines grow beyond four.
- Observability dashboard (metrics from Gap 9) once traffic establishes baselines.
- Native chain-account roll-up architecture if Growth RBAC reveals deeper hierarchy needs.

### Implementation Handoff

**AI-agent / engineer guidelines:**

1. Follow every decision (D1–D37) as documented.
2. Use implementation patterns consistently (§Implementation Patterns & Consistency Rules).
3. Respect package, data, and API boundaries.
4. Route all Stripe calls through `StripeClient` / `ConnectedAccountStripeClient`; derive idempotency keys from business ids.
5. Add every new webhook event type to the routing map **and** write an idempotent handler.
6. Write an audit row for every state-changing service method.
7. Refer to this document for all architectural questions; propose updates via ADR rather than local divergence.

**First implementation priority:** platform-convention validation → Sprint-1 initialisation (§Starter Template Evaluation → Initialisation Command). The correlation-id filter (D20), single `StripeClient` bean (D23), and webhook foundation (D6 + D14 + D31) land before any feature-bearing story.
