---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
releaseMode: phased
status: complete
completedAt: 2026-04-23
inputDocuments:
  - Memoriams_Portal_Product_Brief_and_User_Stories.md
  - dev_project_scope.md
  - CLAUDE.md
  - README.md
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 2
workflowType: prd
projectName: Memoriams Portal
targetStack: JSP + JSTL + jQuery + Bootstrap / Spring Boot (JDK 17) / MySQL / Hibernate / Stripe / AWS EC2
featureScopeSource: Prototype in c:\presales\Legacy.com\legacydotcom_prototype (reference only; not the target codebase)
classification:
  projectType: saas_b2b
  domain: fintech-adjacent (general base + PCI/Stripe compliance callouts; Connect Custom platform-level obligations)
  complexity: medium-high
  projectContext: brownfield
stripeArchitecture: Connect Custom as foundation; funeral homes are Connected Accounts; Issuing on Connected Accounts
complianceFlags:
  - Stripe Connect Custom is the foundational Stripe architecture; every funeral home is onboarded as a Connected Account with KYB before they can transact
  - PCI scope sustained at SAQ-A via hosted Stripe flows (Payment Element, hosted invoices, hosted Connect account-link, hosted Issuing card reveal)
  - KYB data is captured only via Stripe-hosted account-link; beneficial-owner PII never transits Legacy.com servers
  - Webhook signature verification mandatory for `invoice.*` and `account.updated`; idempotency must be persistent (not in-memory)
  - Stripe Issuing cards are issued on each funeral home's Connected Account (cardholder = FH legal entity)
  - PII handling standard; no HIPAA/PHI
  - Tremendous remains the loyalty-fulfilment fallback if Issuing approval for the platform account slips
---

# Product Requirements Document — Memoriams Portal

**Author:** Richard Livingstone
**Date:** 2026-04-23
**Status:** Revised — Stripe Connect Custom as foundational architecture. Ready for downstream BMad workflows (validation, architecture, epics).

> **Feature scope** is derived entirely from the prototype in this working directory. **Implementation target** is the existing Legacy.com Java/Spring Boot + JSP + MySQL/Hibernate stack, per `dev_project_scope.md`. The prototype's Node/React code is a functional/UX reference only and is NOT the target codebase.

## Executive Summary

Memoriams Portal is a self-serve web application for funeral homes in Legacy.com's Memoriams network to place obituary orders, manage billing, and earn and redeem loyalty points — replacing a fragmented manual process (emailed PDF invoices, warehouse-shipped physical-goods loyalty fulfilment, phone-call account enquiries) with a Stripe-powered, real-time experience.

Target users are approved funeral homes (monthly-invoiced, card on file) and non-approved funeral homes (pre-pay per order), ranging from single-location owner-operators to centralised chain accounts teams managing up to ~12 locations. **Desktop-first throughout** — funeral home owners and chain accounts teams operate on desktops for the screen real estate required by the portal's table-heavy views (invoices, listings, loyalty history, reporting). The product brief §6 positions the product as mobile-first; that guidance is superseded by this PRD.

The product is delivered as a new module within the existing Legacy.com Java/Spring Boot platform, reusing the platform's sign-in model, deployment pipeline, and operational conventions. The Node/React/Express prototype that demonstrates the feature set is a functional reference only — not the implementation target.

The underlying commercial thesis: the Memoriams network is the final uninherited piece of Legacy.com's 2026 platform consolidation ahead of a 2027 growth phase. This portal turns an operationally expensive billing relationship into a scalable SaaS surface with a live loyalty programme — unblocking cash-cycle improvement, finance FTE reduction, and a referenceable Stripe Billing + Issuing deployment for the board.

The Stripe architecture is built on **Stripe Connect Custom as the foundation**. Every funeral home is onboarded to Legacy's platform as a Custom Connected Account with full KYB before they can transact. This is architecturally required — loyalty virtual cards are issued to the funeral home's legal entity via Stripe Issuing, which requires the funeral home to exist as a Connected Account — and it delivers three additional platform benefits: KYB is standardised through Stripe's hosted onboarding (no bespoke KYC plumbing), fund flows and fees are visible per funeral home in Stripe Dashboard, and Legacy ops can escalate complex investigations from the portal into Stripe Dashboard directly.

### What Makes This Special

Three pillars combine into the differentiator:

1. **Automated billing end-to-end.** Monthly aggregated invoices, charge-on-file, automated dunning, account freeze on overdue, dynamic per-listing price adjustments flowed into the next invoice via credit-note and line-item corrections. Routine finance work exits the loop on both sides.
2. **Loyalty that gets redeemed.** Points accrue automatically at order placement, visible in the review step before submission. Redemption issues a Stripe Issuing virtual card instantly, replacing physical-goods fulfilment (gift items shipped from a warehouse, with a days-to-weeks delay) that has historically produced near-zero redemption in the existing Memoriams programme.
3. **Real-time self-service visibility.** Current balance, upcoming invoice, order status, points balance, and tier in one always-current portal — eliminating the phone-and-forward workflow that dominates today.

The core insight is that Stripe Billing, Payment Intents, and Issuing now make this achievable as integration work rather than a ground-up build, and the investment window (post-2025 funding, pre-2027 growth) makes the business case land with the board.

Items pending final confirmation — the commercial-narrative weighting of the three pillars, CFO anchor-metric targets, the customer-acquisition boundary, and the scope-reconciliation approach against the brief's P1 backlog — are consolidated under **Outstanding Assumptions** at the end of this document.

## Project Classification

| Dimension | Value |
|---|---|
| Project type | SaaS B2B (multi-tenant portal with role-based access, integrations, subscription-style billing) |
| Domain | Fintech-adjacent — general B2B with PCI-aware Stripe integration (Payment Element, hosted invoices, Issuing). Compliance burden reduced to SAQ-A by keeping card data on Stripe surfaces. |
| Complexity | Medium-high — multi-tenant RBAC, Stripe Connect Custom onboarding + Billing + Issuing-on-Connected-Account integration, KYB state machine, dynamic-pricing adjustment workflow, brownfield integration constraints. No HIPAA/FDA/ISO-26262-class regulatory burden. |
| Project context | Brownfield — new module inside the existing Legacy.com Java/Spring/MySQL platform on AWS EC2. Tech stack, auth, deployment, and code standards are fixed by the existing system. |

### Key delivery constraints carried forward

- **Tech stack (fixed):** JDK 17 + Spring Boot / JSP + JSTL + jQuery 3.6.1 + jQuery UI 1.13.2 + jQuery Validation 1.19.5 + Bootstrap / MySQL + Hibernate / Stripe / AWS EC2 (primary + failover) / Jenkins CI + Snyk SAST / Bitbucket SCCS / IntelliJ / Playwright QA.
- **Match existing paradigms** — do not re-engineer legacy patterns. Reuse existing sign-in/auth model. Java SOLID + DRY within those constraints.
- **No internationalisation** — English-only.
- **No microservices, no heavy UI libraries, no background-job framework** — fit within the existing monolith's patterns.
- **PCI posture:** SAQ-A — no card data through Legacy.com servers. All card handling via Stripe-hosted surfaces. Webhook signature verification mandatory; idempotency persisted to MySQL.

## Success Criteria

### User Success

Measured per persona; the product succeeds when each persona reaches the defined state within the defined timeframe.

**Diane (single-location owner-operator) — primary.**
- Places an obituary order in under 3 minutes on desktop. Measured via client instrumentation from order-wizard entry to submit. *(Time target adapted from brief §5.1, which assumed mobile; desktop-first override applies.)*
- Redeems loyalty points at least once in her first 90 days of active use. Historical baseline in the existing Memoriams scheme is effectively zero — any redemption is uplift.
- Answers "Do you know your current account balance?" correctly, unprompted, 90% of the time in user-research calls. Today the answer is almost always "no — I'd have to check my email for the last PDF".

**Marcus (chain accounts manager) — secondary.**
- Reconciles a month's activity for 12 locations in under 30 minutes using the portal's export. Today's baseline is a half-day manual consolidation.
- Pays a month's invoices in a single session with no phone calls or email threads to Legacy accounts.

**Sam (new pre-pay funeral home) — tertiary.**
- Completes pre-pay checkout for an order in under 60 seconds with a saved card.
- Sees, at all times, a clear progress indicator toward approved-account status and the exact criteria that unlock it.

**Cross-persona baseline.** Portal Net Promoter Score ≥ +30 in the first post-launch-quarter funeral-home survey. Page-level task success rate ≥ 85% measured via first-month session analytics for the five hero journeys (dashboard land, place order, review invoice, redeem points, download statement).

### Business Success

Owned by Legacy CFO and COO. Top two anchor metrics to be confirmed by the CFO during discovery; the remaining two become secondary KPIs. Each carries a proposed measurement approach so the metric is actionable today.

**Anchor candidate 1 — Finance FTE hours saved on Memoriams billing.** Target: **TBC**. Measured as monthly hours logged against Memoriams billing tickets + chase calls, baselined in the 30 days before launch and trended post-launch. Delta × loaded hourly rate = direct cost out.

**Anchor candidate 2 — Physical-goods loyalty fulfilment cost eliminated.** Target: **TBC** (natural ceiling is 100% within 6 months of rollout for every active funeral home). Today's loyalty redemption is fulfilled as shipped physical goods — ranging from low-value items up to iPad-tier rewards at the high end — carrying procurement, warehousing, packing, shipping, and returns/shrinkage costs. Measured as total monthly operating cost of physical-goods fulfilment (procurement overhead + warehousing + shipping + shrinkage) vs a pre-launch baseline. Success = zero physical-goods fulfilment operations once the Issuing / Tremendous path is live for all active funeral homes; Legacy's fulfilment cost collapses to the pass-through reward value plus a marginal Stripe Issuing transaction fee.

**Anchor candidate 3 — Cash-cycle compression.** Target: **TBC**. Measured as mean days-sales-outstanding (DSO) on Memoriams invoices pre- vs post-launch. Auto-advance + dunning + account-freeze on overdue is the lever.

**Anchor candidate 4 — Loyalty redemption-rate lift.** Target: **TBC** (baseline is effectively zero, so any sustained non-zero rate is a win). Measured as (redemptions per active funeral home per quarter) — expect first sustained signal at 90 days.

**Adoption & activation — owned by Product.**
- 95% of new funeral homes complete Connect Custom KYB verification within 7 calendar days of invitation, measured from account-link dispatch to `account.updated` reporting the account as `enabled`.
- 75% of active approved funeral homes complete first portal login within 30 days of rollout invitation.
- 60% of monthly orders placed via portal (rather than legacy channel) within 90 days of full rollout.
- Portal supports Legacy's full Memoriams funeral-home count at launch with <2% session error rate (client + server).

### Technical Success

**Functional correctness.**
- Monthly invoice totals reconcile to Stripe Billing to the cent for every funeral home, every month. Reconciliation is automated; exceptions alert finance within the same business day.
- Dynamic price adjustments always produce a matching Stripe line-item correction or credit-note, with full audit-trail linkage by internal order ID.
- Webhook idempotency is persistent and correct: a Stripe event replay never produces duplicate invoice updates, duplicate listing publications, or duplicate loyalty accruals.

**Non-functional targets.** Authoritative, measurable acceptance lines for performance, availability, accessibility, and compliance are defined in **Non-Functional Requirements (NFR1–NFR27)** later in this document.

**Security & compliance.**
- PCI DSS SAQ-A sustained: no card data touches Legacy.com servers. Verified by quarterly Snyk + Stripe configuration audit.
- All Stripe webhook traffic signature-verified; idempotency key persisted to MySQL; signature failures alerted, never silently dropped.
- All loyalty accruals, redemptions, and Issuing card lifecycle events written to an append-only audit table keyed by user, order, and Stripe object id.
- Snyk SAST pipeline green on main branch; zero critical / high findings unresolved at any release.

**Operability.**
- Every Stripe event handled is logged with event id and type, consistent with Legacy.com platform logging conventions.
- Playwright E2E suite covers the five hero journeys and runs green on every PR in Jenkins.
- Failover drill (primary → secondary EC2) completes without portal-user-visible error within the platform's existing RTO.

### Measurable Outcomes

| Outcome | Leading indicator (weekly) | Lagging indicator (quarterly) |
|---|---|---|
| Diane places orders faster | Median order-wizard completion time | % of orders placed in < 3 min |
| Loyalty gets redeemed | Redemption events / week | % of active FHs with ≥ 1 redemption in quarter |
| Billing runs without human intervention | Support tickets raised re: invoices | Finance FTE hours against Memoriams |
| DSO compresses | Days from invoice issue to paid | Mean DSO vs pre-launch baseline |
| Chain-account workload drops | Portal exports downloaded / month | Marcus-persona NPS |

## Product Scope

Scope is structured as MVP → Growth → Vision. The MVP is defined by what the prototype **actually demonstrates today**, per the Executive Summary's reconciliation assumption. Growth covers the brief's P1–P2 stories the prototype does not yet demonstrate. Vision covers the brief's P3 items and Phase-2 platform work.

### MVP — Minimum Viable Product

Scope anchored on prototype-demonstrated features, re-implemented in the Java/JSP/Spring Boot target stack.

- **Account & sign-in.** Reuse of existing Legacy.com sign-in; funeral-home-scoped landing on Dashboard (ACC-01, ACC-02 — single-user, single-role; multi-user RBAC deferred to Growth).
- **Stripe Connect Custom onboarding.** Each funeral home is a Custom Connected Account. Legacy ops initiates account creation; Stripe-hosted account-link captures KYB (business info, beneficial owners, tax ID, bank via Financial Connections); `account.updated` webhook reflects state transitions (pending / needs-info / restricted / enabled) back into the portal. Ops can resend account-links and deep-link to Stripe Dashboard per FH.
- **Onboarding-state gating.** New funeral homes cannot place listings or receive loyalty redemptions until their Connected Account reaches `enabled`. Restricted / requirements-due states surface actionable messages on the FH dashboard with a link to resume KYB.
- **Dashboard.** Current balance, upcoming monthly invoice, recent listings, loyalty points balance.
- **Listings.** Create obituary listing (single-form, not 4-step wizard — wizard is Growth); edit draft; view listing detail; status lifecycle (draft → pending → upcoming → published). Multi-newspaper selection with per-paper pricing. Billing-partner vs direct-to-funeral-home billing logic.
- **Billing — monthly aggregate.** Monthly invoice aggregation per funeral home (friendly id `INV-YYYY-MM`). Finalise via Stripe; hosted-invoice-URL open; PDF download; `invoice.finalized` / `invoice.paid` / `invoice.payment_failed` webhook handling with persistent idempotency. Listings auto-publish on invoice-paid.
- **Billing — bulk PDF export.** Zip of all finalised monthly invoice PDFs with `_summary.csv` index. Chain-account flavour of this (consolidated CSV across locations) is Growth.
- **Service Fees (admin).** Per-billing-partner commission view for Legacy internal users; read-only.
- **Cart.** Multi-invoice pay-now cart drawer (prototype's current checkout surface for per-listing invoices).
- **Loyalty — earning.** Auto-accrue points on order placement; points-history view; display-only tier badges (tier visualisation with progress bar is Growth).
- **Loyalty — redemption.** Redeem points → Stripe Issuing virtual card issued **on the funeral home's Connected Account** (cardholder = FH legal entity); display card details on redemption via Stripe ephemeral keys; "My Cards" list with remaining balance via Issuing API. Account credit and CPD redemption options are Growth.
- **Admin tools (Legacy staff).** Freeze / unfreeze funeral-home account; simulate payment error (test/demo aid); these are gated behind internal role and do not ship to funeral homes.
- **Operational.** Webhook signature verification mandatory; event ids + types logged; idempotency persisted in MySQL; deployment via existing Jenkins pipeline on AWS EC2 primary+failover; Playwright E2E for hero journeys.

### Growth Features (Post-MVP)

Demo-gap items from the brief §4 P1/P2 list that the prototype does not currently demonstrate, plus the RBAC and chain-account features needed for Marcus's persona to work.

- **Order placement — 4-step wizard** (ORD-01 through ORD-06) with upsells, draft save, review screen showing points preview and line-item breakdown.
- **Dynamic order adjustment flow** (ADJ-01 through ADJ-04) — notification on price change, approve/dispute, timeline audit, cancellation with credit note.
- **Pre-pay flow** (ORD-07, ORD-08) — Stripe Payment Element embedded at order submit for non-approved accounts; saved-card reuse.
- **Auto-advance payment-on-file** (BIL-03) for approved accounts; automated dunning (BIL-05); account-freeze banner and self-service restore (BIL-06).
- **Tier system — visible.** Bronze / Silver / Gold tier with progress bar, threshold points, next-tier copy (LOY-02).
- **Loyalty — notifications** (LOY-06) at milestones; earning history filtering by date.
- **Redemption — account credit and CPD** (RED-04, RED-05).
- **Multi-user and RBAC** (ACC-03) — invite users, Admin/Ordering/Accounts roles.
- **Chain accounts.** Multi-location roll-up; consolidated CSV export filterable by date range (BIL-07).
- **Upgrade pathway** (ACC-04) — pre-pay → approved is a billing-status change *within* an already-onboarded Connected Account: progress widget + submit-for-underwriting flow. No new bank link or KYB re-run needed — both were handled at Connect onboarding (MVP, Journey 0).
- **Notifications.** In-portal notification centre (NOT-01); branded email templates for critical events (NOT-02).

### Vision (Future)

Brief §1.8 out-of-scope items plus brief P3 stories — reserved for Phase 2 / post-board sign-off.

- **Stripe Connect Custom onboarding for newspapers** (brief §1.8). Funeral-home Connect onboarding is MVP; this Vision item is strictly the newspaper side of Connect.
- **Full newspaper settlement** flows using the Connect infrastructure established in MVP.
- **NetSuite sync via Stripe's native connector** (BIL-08) — daily invoice / payment / refund sync for month-end close.
- **Issuing card spending controls** (RED-06) — MCC limits, velocity caps per tier.
- **SMS notifications** (NOT-03) for urgent events (imminent freeze).
- **Legacy admin / ODM operator dashboards** — out of funeral-home-facing scope for this PRD; would be a sibling module.
- **Full adjustment audit-trail surface in Stripe Sigma** (ADJ-05).

### Scope discipline note

Anything that wasn't in the prototype and isn't listed above is out of scope for this PRD entirely, regardless of what surfaces in sprint planning. Scope creep kills the brownfield integration posture — the code-standards and stack constraints already penalise speculative abstraction.

## User Journeys

The journeys below cover the full product shape (MVP + Growth). Each step is tagged **[MVP]** or **[Growth]** to keep scope traceability visible without fragmenting the narrative.

### Journey 0 — Funeral Home Onboards to Memoriams (Connect Custom)

**Opening scene.** Legacy's commercial team has signed a new funeral home, Carter & Sons Funeral Home, in Pittsburgh. Signup happens outside the portal; now it falls to Legacy ops to get Carter & Sons transacting.

**Rising action.**
1. [MVP] Priya (Legacy ops) logs into the portal and opens the funeral-home admin view. She adds Carter & Sons — legal name, primary contact email, country. She clicks **Initiate Connect onboarding**.
2. [MVP] The portal calls Stripe to create a Custom Connected Account for Carter & Sons, then generates a Stripe-hosted account-link URL. An email goes out to the funeral home's primary contact with a one-click link and a short explanation: "Complete your funeral-home registration to activate Memoriams Portal for your business."
3. [MVP] Carter, the owner, opens the link at his desk. Stripe's hosted flow walks him through business details (legal name, address, tax ID), beneficial-owner information, and bank connection via Financial Connections. The flow is Stripe-branded; Legacy collects no KYB data directly.
4. [MVP] Carter completes the flow. Stripe emits `account.updated`. The portal's webhook handler receives it, verifies the signature, stores the event (idempotent), and updates Carter & Sons' cached account state from `pending` → `enabled`.
5. [MVP] The portal sends a confirmation email to Carter — "Your Memoriams account is active" — with a link to sign in via the existing Legacy.com sign-in.
6. [MVP] Priya sees Carter & Sons transition to `enabled` in her admin view. From the funeral-home detail page she can deep-link to Stripe Dashboard to see Carter & Sons' Connected Account for any future investigation.
7. [MVP] Carter signs in to the portal. Dashboard loads with zero listings, zero points, and his billing-status tier set to Pre-pay (the default for a new FH — he'll upgrade to Approved later based on volume per Journey 4).

**Climax.** Later that week Carter places his first obituary. The existing MVP flows (Journey 1 / Journey 4) pick up from there — unchanged by the fact that he's now a Connected Account.

**What happens when KYB stalls.** If Carter leaves the hosted flow mid-way, or if Stripe later requests additional documents, `account.updated` reports unmet requirements. The portal surfaces a "Requirements due" banner on Carter's dashboard with an actionable link that generates a fresh account-link. Priya can also resend the account-link from her admin view. Carter cannot place listings or receive loyalty redemptions until the account returns to `enabled`.

**Resolution.** The funeral home is onboarded as a first-class Stripe entity with verified KYB, a linked bank, and a fully-scoped Connected Account. Legacy ops has visibility into the account in Stripe Dashboard. Stripe Issuing can issue virtual cards to this specific FH's legal entity on redemption. The architectural foundation is in place for every subsequent feature in the product.

**Capabilities revealed.** Connect Custom account creation; Stripe-hosted account-link flow; `account.updated` webhook handling with persistent idempotency; cached Connect-account state machine; onboarding-state gating on listings and redemption; resend-account-link ops tooling; Stripe Dashboard deep-link per FH.

---

### Journey 1 — Diane, Owner-Operator: Place, Earn, Redeem (Happy Path)

**Opening scene.** Diane is the owner-operator of a single-location funeral home in Ohio, 18 years in. She's at her office desk between family meetings. Today she needs to place an obituary for Robert Hayes for two local papers and one regional. Historically this means logging in to the old Memoriams/AdPay system, filling in the form, waiting for a PDF invoice by email that she forwards to her bookkeeper.

**Rising action.**
1. [MVP] She opens the portal in her browser. The Dashboard loads: this month's accrued balance $420, 8,450 loyalty points, last month's invoice paid on time, three listings in flight.
2. [MVP] She taps **New Obituary**. A single-page form opens — deceased name, dates, obituary text, a multi-select for newspapers (2 local + 1 regional), publication date. Per-newspaper pricing is shown inline. Billing-partner vs direct-invoice handling is transparent to her — she doesn't need to know.  *(Growth replaces this with a 4-step wizard, ORD-01, but the single form ships MVP.)*
3. [MVP] She submits. Order placed. Confirmation screen shows the total ($295), tells her that this listing will appear on her April monthly invoice, and — *this is the moment* — displays "You earned 125 loyalty points on this order."
4. [Growth] The points counter animates from 8,450 → 8,575; a tier progress bar fills toward Gold. *(Tier visual is Growth, LOY-02. MVP shows the new point balance as a static number.)*
5. [MVP] She goes back to her families. Two days later, the listing publishes — she gets an email receipt.
6. [MVP] End of month: her April invoice auto-generates in Stripe. She receives the email with the hosted-invoice link. *(Growth auto-charges the card on file via BIL-03; for MVP she clicks the link and pays via Stripe's hosted page. Her card data never touches Legacy.com.)*
7. [MVP] On the portal, her Invoices tab shows April: paid. Status badge updates live (no refresh needed) because the `invoice.paid` webhook flipped the status server-side.

**Climax.** Three months later, Diane has earned 10,000 points. She opens the Loyalty tab, taps **Redeem**, chooses a $100 digital Visa gift card for 5,000 points. The confirmation screen reveals her Stripe Issuing virtual card instantly — number, exp, CVV, copy-to-clipboard for each. She uses it to buy a replacement office printer that evening.

**Resolution.** Diane's new reality: she places orders in under 3 minutes at her desk, she knows what she owes at all times, and for the first time in years she has actually redeemed a loyalty reward — same day, usable that evening, instead of waiting days or weeks for a shipped parcel.

**Capabilities revealed.** Dashboard (balance + points + listings summary); Listings create / list / detail; single-form order placement; email notifications; monthly invoice aggregation + Stripe-hosted payment; `invoice.finalized` / `invoice.paid` webhook handling; loyalty point accrual + history; Issuing-based redemption + My Cards.

---

### Journey 2 — Diane, Edge Case: Missed Payment → Freeze → Recovery

**Opening scene.** Same Diane, two months in. A card on file expires and she hasn't updated it. Her April invoice goes out, auto-charge attempt fails, she's been too busy to notice the email.

**Rising action.**
1. [MVP] Stripe webhook fires `invoice.payment_failed`. Server logs the event, updates the monthly invoice record to `open`/overdue, writes idempotency key.
2. [Growth] Day 3 overdue: automated dunning email 1 is sent. *(BIL-05 — deferred to Growth. For MVP, the overdue state is visible in the portal but outbound reminders are manual from Legacy ops.)*
3. [MVP] Day 30 overdue: Legacy admin reviews the overdue queue, manually freezes her account. *(Growth automates this on schedule.)*
4. [MVP] Diane next opens the portal. Dashboard shows a banner: *"Account temporarily suspended. Outstanding invoice older than 30 days — settle to reactivate."* She cannot start a new obituary; the **+ New Obituary** button opens an explanatory popup instead of the form.
5. [MVP] She taps the banner CTA, which takes her to the overdue invoice and the Stripe hosted pay page. She pays by a different card.
6. [MVP] `invoice.paid` webhook fires. Invoice status flips to paid. The listings inside that monthly invoice auto-publish. *(Unfreeze remains a manual Legacy-ops step in MVP; self-service unfreeze is Growth, BIL-06.)*

**Climax.** She calls Legacy. The ops user in Journey 5 unfreezes her account. Within minutes she's placing new orders again.

**Resolution.** Diane has a clear, in-context explanation of what went wrong and how to fix it — no mystery "your account is disabled" email with no context. The recovery path is visible and dignified.

**Capabilities revealed.** Webhook handling for `invoice.payment_failed`; overdue state modelling; frozen-account gating on order placement with in-context messaging; admin freeze / unfreeze tools; auto-publish trigger on `invoice.paid`.

---

### Journey 3 — Marcus, Chain Accounts Manager: Month-End Reconciliation

**Opening scene.** Marcus runs accounts payable for a 12-location funeral chain. First Monday of the month, he has to reconcile Memoriams activity for 12 homes into Sage before Friday close. Today's process: 12 separate PDF invoices emailed to him, 12 separate line items to verify, a spreadsheet he maintains by hand, and an average of 2 phone calls to Legacy accounts to chase adjustments.

**Rising action.**
1. [Growth] Marcus logs in. His landing view is a **chain consolidated dashboard** — all 12 locations in one table: invoice for April, amount, status, adjustments. *(ACC-03 multi-user + chain roll-up is Growth.)*
2. [MVP] For each home, he can already see the monthly invoice (`INV-2026-04`), status, PDF — but today in MVP he must switch funeral-home context one at a time. *(The bulk flow below is Growth; the single-home flow ships MVP.)*
3. [Growth] He clicks **Export consolidated CSV**. Date-filter: April. CSV downloads with one row per listing across all 12 homes, invoice id, line-item amount, adjustment flag, status. He drops it into Sage. *(BIL-07 — Growth.)*
4. [MVP] In MVP he uses the **Download all PDFs** action already in the prototype — generates a zip of every finalised monthly invoice PDF with a `_summary.csv` index. Works per-home in MVP; chain-wide version is Growth.
5. [Growth] He spots one adjustment he didn't recognise — a $20 price change on a listing for the Kansas City home. He clicks into the adjustment detail: word-count change, old price, new price, who approved, when. He approves — no phone call needed. *(ADJ-04 — Growth.)*
6. [MVP] He pays due invoices via Stripe hosted pages. *(Growth auto-charges card on file — BIL-03.)*

**Climax.** He finishes in 30 minutes. Friday, he gets CFO approval; the Sage upload is clean.

**Resolution.** Half-day-a-month task collapsed to half an hour. Zero phone calls to Legacy. Audit trail on every adjustment without chasing anyone.

**Capabilities revealed.** Multi-tenant chain roll-up; consolidated CSV export; PDF bulk zip; adjustment audit trail surface; RBAC / multi-user permissions; invoice-status aggregation across locations.

---

### Journey 4 — Sam, New Pre-Pay Funeral Home: Upgrade to Approved

**Opening scene.** Sam opened his funeral home 4 months ago. He's KYB-verified — he went through Connect Custom onboarding at sign-up (Journey 0) — but sits in billing-status tier *Pre-pay* because his trading history with Legacy is too short for Approved billing terms. Every obituary he places requires a card charge at point of submission. He's placed 30 orders so far and it's starting to feel friction-heavy.

**Rising action.**
1. [Growth] Sam places an order. At the review step, the Stripe Payment Element is embedded — saved card selected, one-click pay. *(ORD-07, ORD-08 — Growth. MVP does not deliver the embedded Payment Element; pre-pay accounts in MVP route to the same hosted-invoice surface as approved accounts.)*
2. [MVP] In MVP, Sam's experience is essentially identical to Diane's: he creates a listing, a Stripe invoice is created immediately (rather than rolled into a monthly aggregate), he opens the hosted invoice and pays. His listing publishes on payment.
3. [Growth] On the Dashboard, a progress widget tells him: *"You've placed 30 orders in 4 months. You qualify for an approved monthly account — apply now."* *(ACC-04 — Growth.)*
4. [Growth] He clicks Apply. Because KYB was completed at Connect onboarding and a bank account is already on file, the upgrade is a billing-status review by Legacy ops — not a new bank link, not a new KYC. Status changes to *Approved — pending review*.
5. [MVP] Once approved, Sam's next orders accumulate on a monthly invoice the same way Diane's do.

**Climax.** The moment his status flips to Approved, his portal UI changes — the cart/pay friction disappears, next month's invoice aggregates normally, and he continues earning loyalty points exactly as before.

**Resolution.** Sam has a visible path to Approved status with a concrete milestone counter, not a mystery. Because KYB was handled at onboarding, the upgrade is lightweight — a status review, not a re-onboarding. His workflow converges with Diane's.

**Capabilities revealed.** Payment Element embedding (Growth); pre-pay per-order invoicing path (MVP uses hosted invoices); upgrade-eligibility counter; underwriting-review flow (no new KYB, no new bank link); billing-status tier state machine; lifecycle-aware UI.

---

### Journey 5 — Legacy Internal Operator: Watching the Billing Stream

**Opening scene.** A Legacy ops user (let's call her Priya) is responsible for making sure the Memoriams billing stream runs clean. She's logged in with the internal admin role.

**Rising action.**
1. [MVP] Priya opens the **Service Fees** admin view — a read-only roll-up of billing-partner commission for the current month: Hartford Courant, Washington Post, New York Times. Per-partner fee %, listing count, listing value, commission owed, and a per-listing breakdown with invoice status.
2. [MVP] She spots an overdue monthly invoice for a funeral home that's now 35 days out. She opens the home's detail, reviews the history, calls them, confirms they need a freeze.
3. [MVP] She toggles the **Freeze** control. The funeral home's Dashboard now gates new orders; her decision is logged in an audit record keyed to her user id and timestamp.
4. [MVP] A day later the home pays. Priya reviews the overdue queue — invoice is paid via webhook. She toggles freeze off. For a related advanced case — a funeral home questioning a specific charge she can't fully explain from the portal UI alone — she clicks **Open in Stripe Dashboard** on the FH's detail page and drills into the Connected Account's activity, balance, and fee history directly in Stripe. The portal doesn't mirror every Stripe capability; advanced workflows pass through to Stripe Dashboard.
5. [MVP] Later in the day, a Stripe webhook fails signature verification (simulated in demo; real in production). The endpoint logs the failure with event id and Stripe signature header; Priya sees it in the platform logs and opens a ticket with Stripe if needed. **Webhook failures must never silently succeed**.
6. [Growth] Priya uses the dunning / reminder console to configure reminder cadence for overdue accounts. *(BIL-05 — Growth.)*

**Climax.** A funeral home in a chain has an incorrectly-charged monthly invoice — Priya verifies in Stripe's dashboard, issues a credit note, confirms it reflects in the portal on the funeral home side.

**Resolution.** Priya has a tight set of MVP admin controls that let her operate the Memoriams billing stream without touching Stripe's dashboard most days. The rest of Growth's automation (dunning, self-service unfreeze, adjustment workflows) reduces her manual load further when it ships.

**Capabilities revealed.** Internal admin role + permission model; Service Fees read-only roll-up; freeze / unfreeze with audit trail; overdue queue; webhook-failure visibility in operational logs; simulated-error tooling for demo and QA; Stripe Dashboard deep-link per funeral home.

---

### Journey Requirements Summary

Six journeys reveal nine capability areas that the PRD's functional requirements must cover. Each area carries a primary scope tier.

| Capability area | MVP scope | Growth scope | Vision scope |
|---|---|---|---|
| Funeral-home onboarding (Connect Custom) | Account create; hosted account-link; KYB via Financial Connections; `account.updated` webhook; state gating; resend link; Stripe Dashboard deep-link | Ops onboarding-queue view with stalled-KYB alerts | Newspaper Connect Custom onboarding |
| Sign-in and funeral-home context | Reuse existing Legacy auth; single-user per FH | Invite flow; Admin/Ordering/Accounts roles | — |
| Listings lifecycle | Single-form create; status machine; detail view | 4-step wizard; draft save; upsells; cancel with credit note | — |
| Order pricing & adjustments | Per-newspaper pricing; billing-partner vs direct | Adjustment notification, approve/dispute, timeline | Sigma audit surface |
| Invoicing | Monthly aggregate; hosted Stripe payment; PDF; `invoice.*` webhooks | Auto-advance charge on card on file; dunning; self-service unfreeze | NetSuite sync |
| Cart / pay-now | Multi-invoice cart drawer | Embedded Payment Element for pre-pay | — |
| Loyalty | Accrue on order; history; redeem to Issuing card; My Cards | Visible tier + progress; account-credit / CPD redemption; milestone notifications | Issuing spending controls |
| Chain & multi-user | — | Chain roll-up; consolidated CSV export; multi-user RBAC | — |
| Internal admin / ops | Service Fees view; freeze/unfreeze; simulated error tool | Dunning console; automated freeze | ODM operator dashboards |

Every functional requirement in the next section must trace to at least one journey and one capability area here.

## Domain-Specific Requirements

The product's domain posture is fintech-adjacent B2B SaaS: Stripe is the regulated money-mover, Legacy.com is a merchant-of-record using Stripe's hosted surfaces to minimise its own compliance burden. This section captures constraints that shape design decisions across the functional requirements, not targets to be measured.

### Compliance & Regulatory

- **PCI DSS — SAQ-A scope only.** No card primary account numbers (PANs), expiry dates, or CVVs may be collected, transmitted, or stored by Legacy.com infrastructure. Card capture and any card-on-file display happens exclusively via Stripe-hosted surfaces (hosted invoice pages in MVP; Stripe Payment Element in Growth for pre-pay). Issuing virtual-card details may be surfaced to end users only through Stripe's ephemeral-keys-and-Elements pattern on redemption — not persisted in MySQL. *Basis:* PCI DSS 4.0 applicability for e-commerce merchants using fully-outsourced card capture.
- **Data privacy.** Product scope is English-only, US market. CCPA applicability is in play for California funeral homes and their staff; GDPR is not directly in scope but should not be designed out. Minimum posture: consent captured at account setup, data subject access request path documented, 7-year retention on financial records matching Legacy.com's existing policy.
- **Stripe Connect Custom — platform compliance.** Legacy.com operates as a Stripe platform under a Connect platform agreement. Funeral homes are Custom Connected Accounts. Platform responsibilities include: presenting Stripe's Services Agreement to each FH via the hosted account-link; capturing acceptance of terms through the same flow; surfacing ongoing requirements (further KYB, additional beneficial owners) when Stripe requests them; suspending transactions on restricted accounts. All KYB data (business identity, beneficial owners, government IDs, bank details) is captured exclusively through Stripe-hosted surfaces — never by Legacy.com code.
- **Payout / 1099-K reporting.** Where funeral homes receive payouts via their Connected Account (future loyalty payouts, refunds, commissions), Stripe issues 1099-K forms on Legacy's behalf per US tax reporting rules. No bespoke tax-reporting code in this module.
- **Stripe Issuing compliance.** Issuing is enabled on Legacy's platform account. Virtual cards are issued on each funeral home's Connected Account (cardholder = FH legal entity). Approval / underwriting lifecycle with Stripe runs at the platform level, separate from Billing. The product must ship with **Tremendous as a fallback loyalty-fulfilment path** (referenced in brief §1.7), switchable by configuration, in case Issuing approval for the platform account is delayed at go-live. Redemption UI must be agnostic to the fulfilment backend.
- **Financial record-keeping.** All Connect account, invoice, credit-note, adjustment, and Issuing transactions must be reproducible from MySQL records joined to Stripe object IDs for minimum 7 years, supporting Legacy.com's finance-audit posture.

### Technical Constraints

- **Card data never transits Legacy.com servers.** Enforced at design review: any requirement that suggests capturing or proxying card data is a scope violation.
- **Stripe webhook signature verification is mandatory** on every inbound webhook request. Failures return 400 and alert; they must never be silently treated as success. Raw request body must be available to the handler — the Spring Boot controller for webhook endpoints must preserve the raw bytes before any JSON deserialisation.
- **Idempotency is persistent, not in-memory.** Every Stripe event id observed is recorded in a `stripe_webhook_event` table in MySQL with event id, type, received-at, processed-at, result. Duplicate event ids short-circuit with the cached result. The prototype's in-memory `Set<string>` is a prototype shortcut, not a design pattern to carry forward.
- **Idempotency keys on outbound Stripe calls.** Every invoice, invoice-item, credit-note, Issuing-cardholder, and Issuing-card creation must pass a deterministic idempotency key derived from the business operation (e.g., listing id + "create-invoice-item"), so retries on transient failure are safe.
- **Audit trail is append-only.** Point accruals, redemptions, card issuance, card status changes, account freezes, and admin overrides write to an append-only table that never accepts UPDATE or DELETE. Rows key by user id, operation type, object id, timestamp, performing-user id.
- **Monetary amounts are integer cents in storage and API boundaries,** with USD dollar-decimal used only at the presentation layer. The prototype's mixed `amountUsd` dollars-in-code pattern must not be carried forward — it's a persistent source of rounding bugs in brownfield billing systems. All MySQL money columns are `BIGINT` cents with a currency code column (fixed to `USD` for this product).
- **Authentication reuses Legacy.com's existing sign-in model.** No new auth stack. Funeral-home context is derived from the existing session; funeral-home-scoped data access is enforced at the repository layer, not only at the controller layer, to prevent lateral access bugs on refactors.
- **Connect account state machine.** Every funeral-home tenant record carries a `stripe_connect_account_id` plus a cached state (`pending`, `needs-info`, `restricted`, `enabled`). Canonical state lives in Stripe; cache is updated idempotently from `account.updated` webhook. Critical business operations (listing creation, Issuing card issuance, invoice finalisation) check state and fail with a clear error on non-`enabled` accounts.
- **Stripe-hosted account-link is the only KYB entry point.** The portal never renders KYB forms itself. It generates a one-time account-link URL via the Stripe API and either emails it to the FH contact or returns it to the FH user's browser for redirect. Account-link URLs expire per Stripe's default; the portal can mint fresh links at any time.
- **`account.updated` webhook handling.** Subscribed events include `account.updated` (required) and `account.application.deauthorized` (observed for logging). Idempotency and signature verification follow the same contract as `invoice.*` webhooks.
- **Internationalisation is not implemented.** Copy is hard-coded English per `dev_project_scope.md`. Dates, currency, and number formatting use US locale defaults. No message catalogue / resource bundles — an explicit choice to avoid the abstraction cost on a feature the product doesn't need.

### Integration Requirements

- **Stripe** — **Connect Custom** (account create, account-link hosted flow, `account.updated` webhook, Stripe Dashboard deep-link), **Billing API** (customers, invoices, invoice items, credit notes), **Payment Intents** (hosted invoice payment in MVP; Payment Element in Growth), **Issuing on Connected Accounts** (cardholders-on-account, cards, card-status changes), **Financial Connections** (bank linkage, used via Connect onboarding), **Webhooks** (`invoice.finalized`, `invoice.paid`, `invoice.payment_failed`, `account.updated` at minimum; more as Growth features land). Stripe Node SDK patterns in the prototype map to Stripe Java SDK for the target stack.
- **Legacy.com existing auth** — session source of truth. Portal logs in users via the platform's current sign-in, reads funeral-home identity from the session, and delegates all authn concerns to the platform. No username/password handling in this module.
- **SMTP / existing Legacy.com email sender** — outbound email (receipts, redemption confirmations, invoice notifications). Tied to the platform's current mail service; no new mail infrastructure. Templates live with the module; delivery goes through the platform sender.
- **Jenkins CI + Snyk SAST** — pipelines already exist; this module slots into them. No new CI stack. Snyk must pass (no critical / high unresolved) to release.
- **AWS EC2 primary + failover** — deployed via the platform's existing deployment mechanism. Portal module is not a separate service; it's packaged in the platform artifact and deployed together. Session stickiness and failover behaviour are inherited from the platform.
- **MySQL** — one schema, within the existing Legacy.com database where the module's business data (listings, monthly invoices, loyalty points, Stripe event cache, audit rows) lives. Hibernate entities follow the existing codebase's conventions. No separate database instance for the module.
- **Tremendous (fallback)** — integration layer for loyalty fulfilment if Stripe Issuing is delayed or declined. Implemented behind the same redemption interface as Issuing, selectable at configuration.

### Risk Mitigations

- **Stripe Issuing approval slip → Tremendous fallback ready at launch.** Redemption path is fulfilment-agnostic from day one; switching is a configuration change, not a code release.
- **Webhook replay / duplicate delivery → persistent idempotency + deterministic outbound idempotency keys.** Stripe docs warn webhook delivery is at-least-once; design assumes it, never hopes otherwise.
- **Card-handling scope creep → PCI scope contract.** Any ticket that proposes capturing, proxying, or caching card data fails design review. SAQ-A posture is a hard perimeter.
- **Auth reuse assumption risk.** The design depends on the existing Legacy.com auth exposing the concepts this module needs (funeral-home identity, role / permission). If any of these are missing, that's a blocker discovered in Architecture, not in sprint execution — architecture step must validate this concretely against the real codebase.
- **Hibernate / MySQL conventions.** The existing Legacy.com platform is explicitly old; the brief from `dev_project_scope.md` says not to re-engineer legacy patterns. Where the platform already uses an anti-pattern (e.g., ad-hoc SQL strings in place of parameterised queries, monolithic service classes), this module follows suit to minimise surface area — but never where it compromises PCI / security posture. Security posture is the only non-negotiable override of the "match existing paradigms" rule.
- **Rounding and currency drift** — neutralised by integer-cents storage and strict boundary handling. Every money-to-money operation is in cents; only the presentation layer formats.
- **Loyalty point abuse / replay** — a single funeral home placing and then cancelling an order must not accrue points. Accrual is tied to `invoice.paid` (for monthly) or to a final published-listing state, never to placement alone. Design point: paid / published is the accrual trigger, not created.
- **Per-FH Connect onboarding stalls.** A funeral home that stops mid-KYB or gets flagged by Stripe for additional requirements cannot transact. *Mitigation:* actionable "requirements due" banner with a fresh account-link button in the FH dashboard; resend-account-link ops tooling; ops alert when a FH stays in non-`enabled` state past a configurable threshold (default 7 days). Legacy's commercial team picks up stalled accounts from the alert.
- **Stripe platform agreement / Services Agreement prerequisite.** Legacy.com must have a valid Connect platform arrangement with Stripe and the Services Agreement presentation flow configured in the hosted account-link before any FH onboarding can run. *Mitigation:* commercial/legal prerequisite tracked outside the dev timeline; Architecture signoff confirms completion before Sprint 1.

## SaaS B2B Specific Requirements

### Project-Type Overview

Memoriams Portal is a multi-tenant B2B SaaS module inside the existing Legacy.com Java platform. Tenants are **funeral homes** (and, in Growth, **chains of funeral homes**). Legacy.com internal staff are a distinct user class with elevated role. Subscription-style tiers as understood in commercial SaaS (Free/Pro/Enterprise) do not exist; the product has two related-but-orthogonal tier models — billing-status tiers (Pre-pay vs Approved) and loyalty tiers (Bronze / Silver / Gold). Both are documented below because they drive feature visibility and workflow branching.

### Tenant Model

- **Tenant = funeral home.** Identified by an internal `funeral_home_id` plus a `stripe_connect_account_id` (Custom Connected Account). Every business record (listing, monthly invoice, loyalty points row, audit row) carries the funeral home id on the row; tenancy is enforced by the repository layer, not only by the controller layer, to prevent lateral access bugs on refactor.
- **Session-to-tenant mapping** comes from the existing Legacy.com sign-in. The module never re-establishes tenancy from URL parameters or client-supplied identifiers.
- **Chain relationship (Growth).** A chain is a parent record with many funeral-home children. A chain user's session resolves to a chain id; their data access spans the chain's homes, read-only by default, with per-home write access granted by role. In MVP there are no chain users — every user is scoped to exactly one funeral home.
- **Legacy internal users** are outside the tenant model. Their session resolves to an internal role; data access is unrestricted by tenant within the module.
- **Onboarding by Legacy ops + Stripe-hosted KYB.** New funeral homes are provisioned by Legacy ops initiating Connect Custom onboarding from the portal admin (Journey 0, FR58–FR65). The funeral home completes KYB via Stripe-hosted account-link. This module does not build a self-service signup form, tenant deletion flows, or marketing/acquisition surfaces — out of scope for both MVP and Growth.
- **Data residency.** Single region, US, existing Legacy.com MySQL instance. No per-tenant data isolation beyond tenant-id-scoped queries. No per-tenant schemas, separate databases, or dedicated infrastructure.

### RBAC Matrix

MVP ships a minimal role set. Growth expands to the brief's full ACC-03 role model.

**MVP roles**

| Role | Who | Scope | Permissions |
|---|---|---|---|
| Funeral-home user | Any authenticated user associated with one FH | Single funeral home | **Complete Connect KYB via hosted account-link (if not yet done); view current Connect account state and any outstanding requirements.** Create/edit draft listings; submit listings; view monthly invoices; pay via hosted Stripe; view loyalty; redeem; view own listings history |
| Legacy ops admin | Internal staff | All funeral homes | Everything above + view Service Fees roll-up; **initiate Connect Custom onboarding for new FHs and resend account-links**; **deep-link to Stripe Dashboard for any FH's Connected Account**; freeze/unfreeze any FH; view overdue queue; trigger demo/simulated-error tooling (non-prod only) |

**Growth roles (brief ACC-03)**

| Role | Who | Scope | Additional permissions |
|---|---|---|---|
| FH Admin | Appointed user(s) per FH | Single FH | Invite/remove users; assign roles within FH; view audit log |
| FH Ordering | Default for most users | Single FH | Create/submit listings; redeem loyalty (subject to FH policy) |
| FH Accounts | Accounts-focused user | Single FH | Invoice management, payment methods, exports; no listing creation required |
| Chain Accounts Manager | Parent-chain user | All FHs in chain | Read-only roll-up across chain; chain-wide CSV export; per-FH payment (with delegation) |

**Permission enforcement.**

- Controller-level: Spring Security (or platform equivalent) annotations on every endpoint. No endpoint ships without an explicit role check — there is no implicit "any authenticated user" default.
- Repository-level: every query is scoped by the resolved tenant id from the session. Repository methods that bypass tenant scoping exist only for Legacy ops admin and are named explicitly (e.g., `findAllAcrossTenants`) so they stand out in code review.
- UI-level: action buttons and navigation items are rendered conditionally on role; hidden UI is not a substitute for server-side enforcement, but it prevents user confusion.

### "Subscription Tiers" (non-traditional)

The product has two tier models. Neither is a commercial pricing tier. Both operate *within* a Connect-onboarded account — KYB via Journey 0 is a prerequisite for either tier.

**Billing-status tiers — governs billing workflow**

| Tier | Description | Workflow |
|---|---|---|
| Pre-pay | Non-approved FHs | Each listing generates an immediate Stripe invoice; FH pays via hosted page before listing publishes. (MVP.) In Growth, Payment Element replaces the hosted-page step. |
| Approved | Approved FHs with a billing relationship | Listings aggregate to a monthly invoice. FH pays the aggregate — via hosted page in MVP, via card on file auto-advance in Growth. |

**Loyalty tiers — governs reward visibility**

| Tier | Threshold | MVP behaviour | Growth behaviour |
|---|---|---|---|
| Bronze | Default | Badge and points balance shown | Badge + progress bar visible |
| Silver | TBC (brief implies threshold tied to points earned or order volume) | Badge + points balance shown | Badge + progress bar + next-tier CTA |
| Gold | TBC | Badge + points balance shown; unlocks CPD redemption option in Growth | Full experience |

Tier thresholds are **TBC** — brief §2.1 references "Silver tier — 1,550 points to Gold" in Diane's narrative but does not define absolute thresholds. Thresholds need to be set before first launch; they are product-configurable, not customer-configurable.

### Integration List

Integrations are documented in full under Domain-Specific Requirements → Integration Requirements. For project-type mapping, the enterprise-integration surfaces are:

- **Stripe** (external) — Billing, Payment Intents, Issuing, Webhooks
- **Legacy.com platform** (internal) — auth/session, MySQL schema, Jenkins pipeline, AWS EC2 deployment, shared mail sender
- **Tremendous** (external, Growth-optional) — loyalty fulfilment fallback
- **Financial Connections / Stripe Connect Custom** (external, Vision) — pre-pay → approved upgrade flow, newspaper settlement

The module does not expose its own public API for third parties. All endpoints are first-party for the portal UI. Any future integration with NetSuite (brief §1.8) or newspaper systems happens through Stripe's native integrations or a separate module, not through this module's endpoints.

### Desktop-First (overriding brief §6)

Brief §6 positions mobile-first as primary for Diane. The real product is **desktop-first** — funeral home owners and chain accounts teams operate on desktops because the portal's surface is table-heavy (invoices list, listings list, loyalty history, reporting views, Service Fees roll-up, adjustment timelines) and benefits from screen real estate. The brief's §6 guidance is superseded on this point.

- **Primary breakpoint: desktop** (≥1280px width). Every screen is designed for desktop first and must present densely and clearly at common business-desktop resolutions.
- **Minimum supported window: 1024px wide.** Responsive behaviour down to this width is required so users with smaller laptop screens or split-window workflows are not blocked.
- **Mobile is not a target.** The portal does not need to be pleasant on phones. It must not actively break at phone widths (no horizontal scroll or unreachable controls), but no mobile-portrait optimisation is performed.
- **No PWA, no mobile app, no offline mode.**
- **Input model:** keyboard + mouse primary. No touch-first interactions. Hover states are permitted; accessibility alternatives (keyboard focus states) remain required.
- **Performance targets (NFRs) baseline against business broadband on desktop**, not mobile networks.
- **Accessibility: WCAG 2.1 AA** per Success Criteria — audience skews 50+, so clear typography and colour contrast matter regardless of form factor.

### Compliance Requirements

Compliance is documented in Domain-Specific Requirements → Compliance & Regulatory. Summary for project-type traceability:

- PCI DSS SAQ-A (card data never on Legacy servers)
- CCPA applicability for California users; GDPR not in scope by territory
- 7-year retention on financial records
- Stripe Issuing compliance lifecycle (with Tremendous fallback)

### Technical Architecture Considerations

Full architecture is deferred to the separate `bmad-create-architecture` step. PRD-level architecture guardrails:

- **Monolith-friendly.** Module deploys inside the existing Spring Boot platform artifact, not as a separate service. No new deployment units.
- **Controller / Service / Repository layering** consistent with the existing codebase's convention. Services are package-private-by-default where the platform's style allows; public APIs are explicit.
- **JSP templates + JSTL** for server-rendered pages, with jQuery progressive enhancement for interactive surfaces (modals, cart drawer, tab navigation, loyalty redeem flow). Bootstrap as the component grid and styling base.
- **No SPA framework.** No React, Vue, or Angular at any layer. jQuery + JSP is deliberately the ceiling.
- **No front-end build pipeline** beyond the platform's existing asset-bundling approach. No webpack/vite/esbuild unless already present in the platform.
- **Stripe Java SDK** for all outbound Stripe calls. Versioning pinned; upgrades tracked against Stripe's API version pinning.
- **Hibernate entity mapping** follows the platform's existing entity conventions. All money columns are `BIGINT` cents (see Domain Requirements); timestamp columns use the platform's default timezone policy.
- **Playwright E2E** is the target automation layer; no separate unit test framework is mandated beyond what the platform already uses. Unit tests follow the platform's existing pattern.

### Implementation Considerations

- **Sprint-1 vertical slice target (for early PR visibility):** Dashboard landing + Listings create (single form) + monthly invoice aggregation + webhook handling. This is the core read-write loop that everything else extends.
- **Stripe test mode in all non-production environments.** Live keys only in prod. Env-var handling follows the platform's existing secrets management; webhook signing secrets rotate per Stripe convention.
- **No background-job framework.** Where the prototype used timers (e.g., the web client's 5s invoice-refresh poll), the JSP target uses either a simple AJAX poll from the page or a server-side `@Scheduled` method on an existing platform scheduler. No Quartz, no Spring Batch, no message queues.
- **Feature flags** for Growth features that ship behind a flag until rollout is complete (e.g., tier progress bar, chain roll-up, Payment Element pre-pay). Use the platform's existing feature-flag mechanism if one exists; otherwise a config-driven boolean is sufficient — no new feature-flag service.
- **Rollout plan assumption:** one funeral home pilot → expanded pilot → full network rollout. Pre-pay customers may onboard earlier than approved customers because the approved billing workflow has higher blast radius.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approach: Platform + Revenue MVP.** The MVP isn't about proving users want the concept (the brief and existing Memoriams network usage already establish demand) — it's about proving two things in production:

1. **Platform:** that the integration pattern (Stripe Billing + Issuing + Legacy.com auth + existing Jenkins/AWS pipeline) is sound, repeatable, and operable by Legacy's team without elevated support overhead.
2. **Revenue:** that the automated-billing loop (monthly aggregation → hosted payment → webhook-driven reconciliation) measurably reduces finance FTE hours and compresses DSO for real customers.

The MVP does NOT attempt to prove the full brief vision — it deliberately omits the 4-step order wizard, Payment Element pre-pay, dynamic order adjustments, RBAC/chain, tier-progress visuals, and card-on-file auto-advance. Those are Growth scope because they extend, rather than test, the platform-and-revenue thesis.

**Why this philosophy fits.** This is a brownfield integration into an existing, mature platform for an established customer base. Experience-MVP framing would imply we don't yet know what users want — we do, from the brief. Problem-solving-MVP framing would imply the fundamental solution shape is untested — it isn't, the prototype validated it. The unknowns are operational: *does this scale inside Legacy's platform under real traffic and real billing pressure?*

**Rollout progression.**

1. **Internal pilot** — one internal funeral home identity + sandboxed Stripe test mode; end-to-end smoke test of MVP under Legacy staff eyes.
2. **Customer pilot** — one volunteer funeral home in production, monitored closely for 2–4 weeks. Both pre-pay and monthly-approved flows exercised.
3. **Expanded pilot** — ~5 funeral homes mixed across billing-status tiers and regions.
4. **Full rollout** — all active Memoriams funeral homes.

Growth features ship incrementally during or after full rollout, each behind a feature flag (see SaaS B2B → Implementation Considerations). Vision features are Phase-2 programme work, scoped separately.

### Phase Feature Sets

Authoritative feature lists for each phase are defined under **Product Scope** earlier in this document (MVP — Minimum Viable Product, Growth Features, Vision). Journey-to-phase mapping:

- **Journey 1** (Diane — place, earn, redeem): MVP at single-form fidelity; tier progress visual is Growth.
- **Journey 2** (Diane — missed-payment recovery): MVP with manual Legacy-ops freeze/unfreeze; self-service unfreeze and automated dunning are Growth.
- **Journey 3** (Marcus — chain accounts): not supported at MVP beyond single-home login; chain roll-up, consolidated CSV, and multi-user RBAC are Growth.
- **Journey 4** (Sam — pre-pay): MVP uses hosted-invoice payment; embedded Payment Element and upgrade pathway are Growth.
- **Journey 5** (Priya — internal ops): full MVP fidelity.

Feature-flag posture for Growth rollout is documented under SaaS B2B Specific Requirements → Implementation Considerations.

### Resource Requirements

Directional only — firm sizing requires architecture validation (auth/session/permission reuse against real Legacy codebase) plus story-level breakdown. Both are downstream BMad stages: `bmad-create-architecture` and `bmad-create-epics-and-stories`. The ranges below are for planning and commercial conversation, not commitment.

**Proposed team composition (applies across MVP and Growth phases):**

| Role | Allocation (MVP) | Allocation (Growth) | Notes |
|---|---|---|---|
| Tech Lead / Solution Architect | 50% | 50% | Must know Legacy.com codebase; owns integration/auth decisions. |
| Full-stack Java engineer (JSP/Spring/jQuery/Hibernate/MySQL) | 2–3 FTE | 3–4 FTE | Bulk of feature delivery. Stripe Java SDK familiarity helpful but not essential. |
| Front-end engineer (jQuery + Bootstrap, accessibility, mobile-first) | 1 FTE | 1 FTE | Responsive UX is a commitment from brief §6. |
| QA Engineer (Playwright, Java test conventions) | 1 FTE | 1 FTE | Starts Sprint 1; E2E coverage grows as features land. |
| DevOps / Release engineer | 0.2 FTE shared | 0.2 FTE shared | Works within existing Jenkins/Snyk/AWS pipelines. |
| Product Manager | 0.5 FTE | 0.5 FTE | PRD owner; feature-flag rollout decisions; customer-pilot coordination. |
| UX designer | 0.3 FTE | 0.3 FTE | Figma work lives in the prototype phase; handoff → ongoing reviews. |
| Stripe / payments specialist | 0.3 FTE | 0.2 FTE | Can be shared with Tech Lead for a smaller team. Drives Connect Custom onboarding, Issuing-on-Connected-Account, webhook architecture, platform-agreement prerequisites. |

**Directional duration — MVP scope (Phase 1 only):**

- Lower bound: **~5 months** assuming a well-understood Legacy.com codebase, no surprises on auth reuse, Connect platform agreement already in place, and the team is fully allocated.
- Upper bound: **~7.5 months** assuming typical integration friction — one or two auth-adaptation stories, Stripe test-mode learning, Playwright harness setup, one platform-convention compromise, and Connect onboarding UX iteration.
- **Not committed — requires architecture + story breakdown before firm date.** Range revised upward from an earlier 4–6 month estimate following the Connect Custom architectural decision; Connect onboarding, `account.updated` handling, Issuing-on-Connected-Account, and ops tooling for resend-link / Dashboard deep-link add non-trivial scope.

**Directional duration — Growth scope (Phase 2):**

- Lower bound: **~4 months** post-MVP, incremental.
- Upper bound: **~7 months** post-MVP, including RBAC/chain work which is non-trivial.
- Growth can start before MVP is 100% rolled out — pilot-to-full-rollout overlaps with early Growth feature delivery behind flags.

**Directional duration — Vision scope (Phase 3):**

- Out of this PRD's commitment scope. Each Vision item is its own programme work — NetSuite sync is weeks; Stripe Connect Custom with live KYB is months.

**Explicit dependencies that pace the plan:**

- Architecture validation of the existing Legacy.com auth / session / permission model against this module's needs — the one question that, if answered wrong, adds weeks to MVP.
- Stripe Issuing approval lifecycle — Tremendous fallback must be ready at MVP go-live; this is a parallel compliance workstream, not a dev task.
- Legacy.com platform team availability for review / pairing on platform conventions.

### Risk Mitigation Strategy

Risk mitigations at the **domain/technical level** are already captured under Domain-Specific Requirements → Risk Mitigations. This section covers risks specific to **scope and delivery**.

**Technical delivery risks:**

- **Auth reuse assumption (highest-impact risk).** If the existing Legacy.com auth does not expose funeral-home identity, role, or session-to-tenant mapping in a form this module can consume, MVP absorbs adaptation work — potentially weeks. *Mitigation:* architecture step (next BMad stage after this PRD is signed off) must validate this concretely against the real codebase before any sprint commitment.
- **Brownfield platform conventions.** The existing codebase may dictate patterns that conflict with SOLID/DRY instincts. *Mitigation:* explicit design-review rule to match existing paradigms unless PCI/security is compromised. Security is the only non-negotiable override.
- **Stripe Issuing approval lead time.** *Mitigation:* Tremendous fallback path implemented behind the same redemption interface from day one, config-switchable.
- **Webhook reliability.** *Mitigation:* persistent idempotency, signature-verify-or-alert, never silently drop. Covered in Domain Requirements.
- **Money-rounding drift from mixed decimal/integer handling.** *Mitigation:* integer-cents at storage and API boundaries enforced from Sprint 1 onward. Covered in Domain Requirements.
- **Connect onboarding completion rate at pilot.** If real funeral homes stall in KYB above target (Success Criteria: 95% within 7 days), MVP rollout slows. *Mitigation:* actionable-requirements UX in the FH dashboard, Legacy commercial-team follow-up on stalled onboardings (alert at configurable threshold), resend-account-link ops tooling; pilot feedback shapes Growth's ops onboarding-queue view.

**Market / commercial risks:**

- **CFO metric targets still TBC.** Until top-two commercial metrics are set, there's no quantitative sign-off gate on success. *Mitigation:* flag as a gating item before Architecture signoff; the metrics affect instrumentation scope.
- **Pilot funeral home(s) not yet identified.** *Mitigation:* named pilot candidate(s) become a prerequisite for entering the customer-pilot rollout stage, not a blocker for MVP build.
- **Tier threshold configuration (Bronze/Silver/Gold).** *Mitigation:* product-configurable in MVP; numeric thresholds set before first customer pilot.

**Resource / scope risks:**

- **Scope creep via Growth features sneaking into MVP commitments.** *Mitigation:* PRD-as-contract; any scope addition requires explicit sign-off and regression against resource estimate. Feature flags make it easy to say "built but not enabled" instead of "skipped".
- **Platform team availability constraints.** *Mitigation:* shared DevOps / Tech Lead allocation assumes part-time. If Legacy.com platform team is constrained, duration extends — Growth slips before MVP does. MVP scope is sacrosanct because it's the commercial case.
- **Prototype-to-target translation overhead underestimated.** The prototype is Node/React — patterns map, but syntax and framework idioms do not. *Mitigation:* Sprint 1 deliberately targets the vertical slice (Dashboard + Listings + monthly invoice + webhook) to surface translation-cost reality early; estimates for subsequent sprints adjust based on actuals.
- **Connect onboarding has no prototype precedent.** The prototype has no onboarding flow at all; Connect Custom onboarding is greenfield work relative to the prototype-scope anchor. This is the one place the PRD deliberately adds scope beyond prototype-demonstrated features because Connect is a foundational architectural requirement, not a feature extension. *Mitigation:* Architecture step must confirm Stripe platform-agreement prerequisites are satisfied and design the account-state caching, `account.updated` handling, resend-link ops surface, and Dashboard-deep-link before Sprint 1 starts.

## Functional Requirements

The requirements below are the binding capability contract for Memoriams Portal. Any feature absent from this list will not exist in the product. Each FR is tagged with its scope tier: **[MVP]** must ship in Phase 1; **[Growth]** ships in Phase 2; **[Vision]** is Phase-2-programme scope, deferred beyond this PRD's commitment boundary but retained here so dependencies remain visible.

FRs state WHAT capabilities exist and for WHOM — they are deliberately implementation-agnostic. Acceptance-criteria-level detail lives in the epic and story breakdown, not here.

### Sign-in and Tenant Context

- **FR1 [MVP]** Funeral-home users can sign in to the portal using the existing Legacy.com sign-in model, without this module handling usernames or passwords directly.
- **FR2 [MVP]** On successful sign-in, the portal resolves the user's funeral-home identity from the existing platform session.
- **FR3 [MVP]** The portal scopes every user-facing data query to the user's funeral home and rejects any request that attempts to read or mutate data belonging to another funeral home.
- **FR4 [MVP]** Legacy internal operators can sign in with an elevated role that grants cross-funeral-home read access and administrative controls.
- **FR5 [Growth]** Funeral-home admins can invite additional users into their funeral home and assign each invitee one of the defined in-home roles (Admin, Ordering, Accounts).
- **FR6 [Growth]** Chain-accounts users can sign in and see a consolidated view spanning every funeral home in their chain.
- **FR7 [MVP]** The portal logs every sign-in event with user identity, funeral-home context, and timestamp.

### Funeral-Home Onboarding (Connect Custom)

- **FR58 [MVP]** Legacy ops can initiate Stripe Connect Custom account creation for a new funeral home from the portal, providing at minimum legal name, primary contact email, and country.
- **FR59 [MVP]** The portal generates a Stripe-hosted account-link URL for a pending funeral home and dispatches it to the primary contact via the existing Legacy.com mail sender with a short branded onboarding message.
- **FR60 [MVP]** Funeral-home admins can complete Connect KYB via Stripe-hosted onboarding, including business details, beneficial-owner information, tax identifier, and bank-account linkage via Financial Connections — without any KYB data transiting Legacy.com infrastructure.
- **FR61 [MVP]** The portal displays the funeral home's current Connect account state (pending / needs-info / restricted / enabled) on both funeral-home-facing dashboards and Legacy-ops admin views, with a human-readable description of what each state requires of the user.
- **FR62 [MVP]** The portal surfaces unmet Connect requirements on the funeral-home's dashboard with an actionable control that generates a fresh hosted account-link to resume KYB.
- **FR63 [MVP]** The portal idempotently processes `account.updated` webhooks from Stripe, updating the cached Connect account state and emitting ops alerts on configured transitions (e.g., newly-restricted, newly-enabled).
- **FR64 [MVP]** Legacy ops can open the Stripe Dashboard for any funeral home's Connected Account via a deep-link from the portal's funeral-home detail view, for advanced investigations that bypass the portal UI.
- **FR65 [MVP]** Legacy ops can resend an account-link to any funeral home whose Connect account is not yet in the `enabled` state, generating a fresh hosted URL each time.

### Listings Lifecycle

- **FR8 [MVP]** Funeral-home users can create an obituary listing by entering deceased name, dates, obituary text, one or more newspaper selections, and a publication date.
- **FR9 [MVP]** The portal surfaces per-newspaper pricing to the user at listing-creation time, computed from the newspapers and options chosen.
- **FR10 [MVP]** The portal distinguishes between newspapers that Legacy invoices on behalf of (billing-partner model) and newspapers that the funeral home is invoiced for directly, and applies the correct billing path per listing.
- **FR11 [MVP]** Funeral-home users can save a listing as a draft before submitting.
- **FR12 [MVP]** Funeral-home users can edit a listing while it is in draft, pending, or upcoming status.
- **FR13 [MVP]** Funeral-home users can view full detail of any listing associated with their funeral home, including its current status and price.
- **FR14 [MVP]** The portal maintains a listing status lifecycle of draft → pending → upcoming → published, with transitions driven by defined events (submit, invoice payment, publication date reached, etc.).
- **FR15 [Growth]** Funeral-home users can place orders through a multi-step guided wizard with step-wise validation and state preservation on back navigation.
- **FR16 [Growth]** Funeral-home users can add priced upsells (e.g., photo, candle, online memorial) to a listing during order placement.
- **FR17 [Growth]** Funeral-home users can cancel a listing prior to publication and receive a credit note or refund corresponding to the listing's invoicing state.

### Billing and Invoicing

- **FR18 [MVP]** For approved funeral homes, the portal aggregates a calendar month's listings into a single monthly invoice identified by a friendly identifier (form `INV-YYYY-MM`).
- **FR19 [MVP]** Funeral-home users can view every monthly invoice associated with their funeral home, including status, due date, total due, total paid, and the listings comprising it.
- **FR20 [MVP]** Funeral-home users can finalise and pay a monthly invoice via a Stripe-hosted payment surface, without card data transiting Legacy.com infrastructure.
- **FR21 [MVP]** Funeral-home users can download a PDF of any finalised or paid monthly invoice.
- **FR22 [MVP]** Funeral-home users can download a bundled zip archive of every finalised monthly invoice PDF together with a summary index.
- **FR23 [MVP]** For pre-pay (non-approved) funeral homes, the portal creates a per-listing Stripe invoice immediately on submission and presents the hosted payment surface before the listing publishes.
- **FR24 [MVP]** The portal receives, verifies the signature of, and idempotently processes Stripe webhook events for `invoice.finalized`, `invoice.paid`, and `invoice.payment_failed`, reflecting the invoice state back in the portal.
- **FR25 [MVP]** On `invoice.paid`, the portal transitions every listing associated with the invoice to published status.
- **FR26 [MVP]** Funeral-home users can select multiple unpaid invoices in a cart and initiate payment across them in a single session.
- **FR27 [Growth]** For approved funeral homes with a card on file, the portal auto-advances the monthly invoice on its due date, charging the saved card without further user action.
- **FR28 [Growth]** For pre-pay funeral homes, the portal presents an embedded Stripe Payment Element at order submit in place of the hosted page, allowing saved-card selection.
- **FR29 [Growth]** The portal triggers configurable dunning communications (reminder emails) on a defined cadence when a monthly invoice passes its due date.
- **FR30 [Growth]** Chain-accounts users can export a consolidated CSV of listings and invoices across every funeral home in the chain, filtered by date range.

### Loyalty

- **FR31 [MVP]** The portal accrues loyalty points to a funeral home when a listing reaches a final successful billing state (invoice paid for approved accounts; listing published after pre-pay for non-approved accounts), never on listing creation alone.
- **FR32 [MVP]** Funeral-home users can view their current loyalty points balance and tier name at any time in the portal.
- **FR33 [MVP]** Funeral-home users can view a chronological history of loyalty earning and redemption events for their funeral home.
- **FR34 [MVP]** Funeral-home users can redeem loyalty points for a digital reward backed by either Stripe Issuing (virtual card issued on the funeral home's Connected Account; cardholder = FH legal entity) or an equivalent fulfilment path (Tremendous), selectable at the product-configuration level.
- **FR35 [MVP]** On successful redemption, the portal presents the redeemed card details (number, expiry, security code) to the user via a Stripe-ephemeral-keys mechanism, without persisting those details in Legacy.com storage.
- **FR36 [MVP]** Funeral-home users can view a list of previously redeemed cards and their remaining balances, with balances fetched from the issuing backend.
- **FR37 [Growth]** The portal presents a visible tier (Bronze / Silver / Gold) and progress-to-next-tier indicator on user-facing surfaces.
- **FR38 [Growth]** Funeral-home users can redeem loyalty points for account credit applied to their next monthly invoice, or (at Gold tier) for a CPD voucher.
- **FR39 [Growth]** The portal emits notifications when a funeral home crosses a tier threshold or a redemption threshold.

### Account Management

- **FR40 [MVP]** Funeral-home users can see their billing-status tier (approved or pre-pay) prominently on the dashboard and in account-detail views.
- **FR41 [MVP]** When a funeral home is in a frozen state (billing freeze) or its Connect account is not in `enabled` state (KYB incomplete, requirements due, restricted), the portal prevents the creation or submission of new listings and surfaces an explanatory message with an actionable path to resolution (pay overdue invoice, or resume KYB via a fresh account-link, as appropriate).
- **FR42 [Growth]** Pre-pay funeral homes can see a progress indicator toward approved-account eligibility and initiate an underwriting-review request. Because KYB and bank linkage were completed at Connect onboarding (FR60), this is a billing-status review, not a new bank-verification flow.

### Internal Operations

- **FR43 [MVP]** Legacy internal operators can view a read-only roll-up of service-fee / commission owed per billing-partner newspaper, with a per-listing breakdown.
- **FR44 [MVP]** Legacy internal operators can freeze and unfreeze a funeral home's account, with the action recorded in an append-only audit record.
- **FR45 [MVP]** Legacy internal operators can view the queue of monthly invoices that are currently overdue across the network.
- **FR46 [MVP]** In non-production environments only, Legacy internal operators can enable a simulated-error toggle that causes downstream payment flows to return a synthetic failure, for demo and QA purposes.
- **FR47 [Growth]** Legacy internal operators can configure the dunning cadence for overdue monthly invoices.

### Notifications

- **FR48 [MVP]** The portal sends a transactional email confirmation to the funeral home on listing submission and on invoice status transitions, using the existing Legacy.com mail sender.
- **FR49 [Growth]** Funeral-home users can see an in-portal notification centre listing recent account, billing, and loyalty events with deep links to the relevant screen.
- **FR50 [Growth]** The portal sends branded email notifications for a defined event set (invoice issued, payment failed, redemption succeeded, tier milestone reached), with a preference centre for opt-outs.

### Order Adjustments

- **FR51 [Growth]** When the price of an in-flight listing changes after submission, the portal notifies the funeral home in-app and (if enabled) by email, surfacing the before-and-after amounts and the reason.
- **FR52 [Growth]** Funeral-home users can approve or dispute a price adjustment, with approve producing a matching Stripe invoice-line-item correction or credit note.
- **FR53 [Growth]** Funeral-home users can view the full adjustment history of a listing, including who changed what, when, and why.

### Audit and Compliance

- **FR54 [MVP]** The portal records every loyalty accrual, redemption, card issuance, card status change, freeze, unfreeze, and administrative override to an append-only audit store keyed by user, object, and timestamp.
- **FR55 [MVP]** The portal captures a deterministic idempotency key on every outbound Stripe mutation (invoice, invoice-item, credit-note, cardholder, card) derived from the originating business operation, so retries cannot produce duplicates.
- **FR56 [MVP]** The portal records every inbound Stripe webhook event with its Stripe event id, type, signature-verification result, received-at, processed-at, and processing outcome, and short-circuits duplicate delivery using persistent state.
- **FR57 [MVP]** Every money-affecting record in the portal is reproducible from Legacy.com persistence joined to its Stripe object id for a minimum seven-year retention window.

## Non-Functional Requirements

NFRs specify HOW WELL the product must perform; they complement the capability contract in Functional Requirements. Each NFR is measurable so conformance can be verified against a defined test or instrumentation point.

Categories are deliberately narrow: only the quality attributes that matter for this product are included. Where a category has no meaningful specific requirement beyond what Success Criteria already states (e.g., scalability as traffic growth, which is bounded by the closed Memoriams funeral-home network and has no stated growth target), that category is subsumed rather than duplicated.

Performance baselines target **desktop on business-broadband connections**, consistent with the desktop-first posture established under SaaS B2B Specific Requirements. Mobile connections are not a target.

### Performance

- **NFR1** p95 dashboard page load completes within 1.5 seconds on a business-broadband desktop connection, measured from request initiation to First Contentful Paint.
- **NFR2** p95 listing-submit round-trip completes within 2 seconds, measured from submit click to server-confirmed persistence (excludes time on any redirected Stripe hosted page).
- **NFR3** p95 invoice-list fetch completes within 1 second for a funeral home with up to 24 months of history.
- **NFR4** p95 loyalty-redemption round-trip completes within 3 seconds from confirm click to card details displayed (includes Stripe Issuing or Tremendous round-trip).
- **NFR5** p99 Stripe webhook processing (for both `invoice.*` and `account.updated` events) completes within 5 seconds of receipt — ingest, signature verify, idempotent apply, persist.

### Security

- **NFR6** No card primary account number, expiry, or security code is ever captured, transmitted, or stored by Legacy.com infrastructure. Verified by quarterly Snyk + Stripe configuration audit and penetration test.
- **NFR7** All user-facing endpoints require an authenticated session established via the existing Legacy.com sign-in; unauthenticated requests return HTTP 401 with no data disclosure.
- **NFR8** Every user-facing endpoint enforces role and tenant checks server-side; repository-level queries are tenant-scoped by default. Bypasses are named explicitly and exist only for Legacy internal operators.
- **NFR9** All Stripe webhook inbound requests verify signature against the active webhook signing secret; failures return HTTP 400, emit an alert, and are never silently treated as success.
- **NFR10** Every outbound Stripe mutation passes a deterministic idempotency key derived from the originating business operation (listing id, invoice id, redemption id, etc.).
- **NFR11** Secrets (Stripe keys, webhook signing secrets, SMTP credentials) are loaded from the existing Legacy.com secrets management; no secret appears in source control, log output, or error messages.
- **NFR12** Snyk SAST passes with zero critical and zero high findings unresolved at any release; release is blocked until resolved or explicitly risk-accepted.

### Accessibility

- **NFR13** All funeral-home-facing screens conform to WCAG 2.1 AA.
- **NFR14** The portal is usable end-to-end without a mouse — every interactive control is reachable and operable by keyboard, with visible focus indicators.
- **NFR15** Every non-decorative image has meaningful alternative text; every form input has an associated label or aria-label.
- **NFR16** Automated accessibility scan (axe-core or equivalent, or whatever Legacy.com already runs in its pipeline) executes on every PR and blocks release on new critical violations.

### Reliability and Availability

- **NFR17** Portal module availability target: 99.5% monthly, measured as successful HTTP responses at the platform edge, inherited from or exceeded by the existing Legacy.com platform SLO.
- **NFR18** The portal tolerates AWS EC2 primary→failover transition without data loss; in-flight user sessions re-authenticate via the existing platform session behaviour without bespoke handling in this module.
- **NFR19** Stripe webhook processing is resilient to duplicate and out-of-order delivery; replaying any previously-processed event id produces no duplicate side effect.
- **NFR20** Persistent Stripe-event state allows recovery from any process restart with no lost events and no reprocessed events.

### Integration

- **NFR21** Stripe SDK version is pinned and upgraded on a quarterly review cadence; Stripe API version is pinned explicitly on the Stripe account, not floated to latest.
- **NFR22** Tremendous fallback is feature-complete at MVP go-live and switchable between Stripe Issuing and Tremendous by configuration change, without source-code release.
- **NFR23** Outbound email uses the existing Legacy.com mail sender; no new SMTP infrastructure, no new deliverability reputation.

### Usability

- **NFR24** The portal is usable by a first-time user with no training for the Diane persona journey (create a listing, view an invoice, redeem points). Validated via moderated usability session on a sample of funeral-home users prior to customer pilot.
- **NFR25** Error states surfaced to users describe cause and resolution in plain English; technical stack traces and raw Stripe error codes are never shown in the UI.

### Observability

- **NFR26** Every Stripe webhook event handled emits a structured log entry containing event id, event type, signature-verification outcome, processing outcome, and correlation id — consistent with the existing Legacy.com logging conventions.
- **NFR27** Every user-facing 5xx error produces a log entry with the user id, funeral-home context, endpoint, and correlation id; fatal errors trigger alerting via the existing Legacy.com alerting infrastructure.

### Compliance

Compliance NFRs are captured as enforceable audit requirements in Functional Requirements FR54–FR57 (append-only audit, idempotency, webhook record, seven-year retention) and as posture requirements in Domain-Specific Requirements (PCI SAQ-A, CCPA, Stripe Issuing lifecycle). No additional NFRs are needed — the functional and domain coverage is the testable requirement set.

## Outstanding Assumptions

The items below have driven the PRD's direction but remain for explicit confirmation by the relevant stakeholder. Each carries the impact on the PRD if the assumption is wrong, and the owner responsible for resolving it.

### Commercial

- **Pillar weighting for the CFO narrative.** *Assumed:* Pillar 1 (automated billing) leads the CFO story; Pillars 2 (loyalty) and 3 (real-time visibility) support. The board hero-flow demo per brief §5.1 interleaves Pillars 1 and 2. *If wrong:* Executive Summary ordering and board-deck framing change, but no FR/NFR impact. *Owner:* Legacy CFO + Product.
- **CFO anchor-metric targets.** *Assumed:* top two of (finance FTE hours saved, physical-goods fulfilment cost eliminated, cash-cycle compression, redemption-rate lift) become anchor KPIs; remaining two are secondary. Numeric targets are TBC. *If wrong:* Success Criteria targets may shift; instrumentation scope adjusts accordingly. *Owner:* Legacy CFO. *Gating:* resolve before Architecture sign-off so instrumentation can be designed against the correct metrics.
- **Customer-acquisition scope.** *Assumed:* the portal targets the existing Memoriams funeral-home footprint; new-customer acquisition flows (marketing site, signup funnel, self-service onboarding) are out of this PRD's scope. *If wrong:* significant additional scope — likely a separate PRD. *Owner:* Product + Commercial.

### Scope reconciliation

- **MVP scope = prototype-demonstrated features.** *Assumed (option c from vision review):* the PRD's MVP is scoped to what the prototype actually demonstrates today; brief-§4 P1 stories the prototype does not demonstrate (4-step order wizard ORD-01, pre-pay Payment Element ORD-07, dynamic order adjustments ADJ-01/02, visible tier LOY-02) are scoped to Growth. *If wrong (i.e., any of those move into MVP):* MVP duration range shifts upward, team composition may widen, resource estimate revises. *Owner:* Product + Tech Lead. *Gating:* resolve before Architecture.

### Pending before first customer pilot

- **Loyalty tier thresholds (Bronze / Silver / Gold).** Brief §2.1 hints at "1,550 points to Gold" but defines no absolute numeric thresholds. Thresholds are product-configurable, not customer-configurable. *Owner:* Product.
- **Pilot funeral home(s) identified.** Named volunteers for internal pilot → customer pilot → expanded pilot, per the rollout progression in Project Scoping. *Owner:* Commercial.

### Architecture-gated

These assumptions must be validated against the real Legacy.com codebase during the `bmad-create-architecture` step, not sprint execution:

- **Existing Legacy.com auth exposes funeral-home identity, role, and session-to-tenant mapping** in a form consumable by this module. *If wrong:* MVP absorbs adaptation work, potentially weeks. *Owner:* Tech Lead / Solution Architect.
- **Legacy.com platform already has a shared mail sender, feature-flag mechanism, secrets management, and `@Scheduled` / simple scheduler capability.** *If any are missing:* corresponding integration stories land in MVP scope. *Owner:* Tech Lead.
- **Money-column convention in the existing codebase.** If the platform already has an established money convention, we inherit it rather than impose integer-cents from scratch. *If none exists:* integer-cents `BIGINT` is adopted as specified in Domain Requirements. *Owner:* Tech Lead.
- **Platform availability SLO.** If the Legacy.com platform publishes a monthly availability SLO, the portal inherits it; otherwise NFR17's 99.5% stands as commitment. *Owner:* Platform / Tech Lead.

### Regulatory / operational

- **Stripe Connect platform agreement in place.** Legacy.com must hold a valid Connect platform arrangement with Stripe, including the Services Agreement presentation flow configured in the hosted account-link. *If not in place:* Connect-dependent work — which is now foundational (Issuing, KYB, per-FH Dashboard visibility, FR58–FR65) — cannot start. *Owner:* Commercial + Legal + Stripe Partner Manager. *Gating:* resolve before Architecture signoff.
- **Stripe Issuing approval for Legacy.com's platform account** will complete ahead of MVP go-live. *If delayed:* Tremendous fallback (per Domain Requirements → Risk Mitigations and NFR22) is activated by configuration; redemption UI is unaffected. *Owner:* Commercial + Stripe relationship.
- **Per-FH KYB underwriting lead time within Stripe tolerance.** Assumes typical Stripe Connect Custom KYB completes within 7 calendar days of invitation for most FHs (matches the Success Criteria target). *If typical lead time is materially longer:* MVP rollout cadence slows; commercial/ops workflow absorbs more stalled accounts. *Owner:* Commercial + Stripe Partner Manager.

### Resolution protocol

Items above are reviewed at every PRD revision. Any material change to an assumption triggers a PRD change note and (if scope-affecting) revalidation of downstream BMad artefacts (Architecture, Epics, Sprint Plan).
