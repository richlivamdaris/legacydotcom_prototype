# Obituaries Portal — Project Timeline

> **How to use this file in Whimsical**
> 1. In Whimsical, create a new board → use the AI generator → paste this markdown.
> 2. Choose **Mind map** or **Flowchart** output for the overall phase view.
> 3. For a classic timeline/Gantt look, create a new *Flowchart* and paste the phase sections one at a time as horizontal swimlanes.
> The structure below is deliberately flat nested bullets so Whimsical's importer renders each bullet as a node.

---

## Baseline assumptions for this timeline

- Team: 2 Java devs (1 senior + 1 mid), 1 QA, 1 BA, 1 PM = 5 FTE
- 2-week sprints
- Scope: MVP only (Epics 1–6). Growth roadmap (Epics 7–12) shown separately at the end.
- Total calendar: ~11 months end-to-end
- All week numbers are cumulative from Project Day 1

---

# Phase 1 — Discovery Kickoff

- **Weeks 1–3 · Discovery Kickoff**
  - Stakeholder alignment
    - Client exec kickoff
    - Legacy.com platform team intro
    - Stripe account manager intro
  - Scope ratification
    - Walk MVP Epic List (1–6) with product owner
    - Confirm Growth deferral (Epics 7–12)
    - Sign-off on NFRs and architecture decisions
  - Commercial and compliance track kicked off
    - Stripe Connect Custom KYB process initiated
    - PCI SAQ-A perimeter confirmed with security
    - Legal review of Connected Account terms
  - Technical readiness
    - Dev environments on AWS EC2 provisioned
    - Stripe test-mode accounts issued to all devs
    - Jenkins pipeline stub for new `obituaries` module
    - MySQL schema playground branched from Legacy.com prod schema
  - Pilot cohort identified
    - Target list of 5–10 FHs agreed with client
    - Pilot communication plan drafted by BA
  - Outputs
    - Ratified scope + sprint zero charter
    - Pilot FH shortlist
    - Stripe KYB tracker opened
    - Risk register v1

---

# Phase 2 — Agile Develop / Test

- **Weeks 4–7 · Sprints 1–2 · Foundation & Ramp-up**
  - Epic 1 foundational stories
    - Story 1.1 Module scaffold + SDK pin + platform-convention validation report
    - Story 1.2 Correlation-id filter + structured logs + error envelope
    - Story 1.3 Stripe client beans + idempotency helpers
    - Story 1.4 Webhook endpoint + signature verification
    - Story 1.5 Append-only audit store
    - Story 1.6 Tenancy filter + scoped repositories
    - Story 1.7 Feature-flag service
  - Milestone
    - Platform-convention validation report signed off
    - End of ramp-up; velocity baseline set
    - Go/no-go decision point for any major architecture adjustments

- **Weeks 8–11 · Sprints 3–4 · Connect Custom Onboarding**
  - Epic 1 Connect Custom stories
    - Story 1.8 FH table extension + Connect-state cache
    - Story 1.9 Session-derived FH context + role resolution
    - Story 1.10 Sign-in event logging
    - Story 1.11 Initiate Connect Custom account creation
    - Story 1.12 Generate + email hosted account-link
    - Story 1.13 Handle `account.updated` webhook
    - Story 1.14 Display Connect state on FH dashboard + ops view
    - Story 1.15 Requirements-due banner
    - Story 1.16 Stripe Dashboard deep-link per FH
    - Story 1.17 Resend account-link ops action
    - Story 1.18 Daily Connect-state reconciliation job
  - Milestone
    - Epic 1 closes · first FH can onboard to Stripe Connect Custom in test mode
    - Senior demos end-to-end onboarding to client

- **Weeks 12–15 · Sprints 5–6 · Listings & Pre-Pay Invoicing**
  - Epic 2 stories
    - Story 2.1 Listing entity + state machine + schema
    - Story 2.2 Newspaper catalog + price quote
    - Story 2.3 Create listing as draft
    - Story 2.4 Edit listing
    - Story 2.5 Submit listing (approved FH — queue)
    - Story 2.6 Submit listing (pre-pay FH — immediate Stripe hosted invoice)
    - Story 2.7 View listing detail
    - Story 2.8 List my listings
  - Milestone
    - Pre-pay FH flow live in test mode
    - First end-to-end hosted-invoice payment demo

- **Weeks 16–19 · Sprints 7–8 · Monthly Aggregation & Billing**
  - Epic 3 stories
    - Story 3.1 Monthly invoice entity + schema
    - Story 3.2 Monthly close scheduler (America/New_York)
    - Story 3.3 `invoice.finalized` webhook handler
    - Story 3.4 List + detail monthly invoices
    - Story 3.5 Finalise + pay monthly invoice
    - Story 3.6 `invoice.paid` webhook (publishes listings + accrues loyalty)
    - Story 3.7 `invoice.payment_failed` webhook → overdue
    - Story 3.8 Download invoice PDF
    - Story 3.9 Bulk-export PDF zip
    - Story 3.10 Multi-invoice cart drawer
  - Milestone
    - Monthly close simulated end-to-end
    - Finance workflow reviewed with client's accounts team

- **Weeks 20–23 · Sprints 9–10 · Loyalty & Stripe Issuing**
  - Epic 4 stories
    - Story 4.1 Points ledger schema + accrual trigger
    - Story 4.2 Points balance + tier view
    - Story 4.3 Points history
    - Story 4.4 Fulfilment strategy interface + selector
    - Story 4.5 Redeem points via Stripe Issuing on Connected Account · heaviest single story
    - Story 4.6 Reveal card details via ephemeral keys
    - Story 4.7 My Cards list with remaining balances
  - Milestone
    - First test-mode virtual card issued + revealed
    - Tremendous fallback toggled via feature flag and verified
    - Senior + mid dev knowledge-transfer checkpoint on Issuing

- **Weeks 24–27 · Sprints 11–12 · Exception Handling & Ops Console**
  - Epic 5 stories
    - Story 5.1 Freeze / unfreeze FH (ops)
    - Story 5.2 Frozen-state gating
    - Story 5.3 In-context CTA from freeze banner
    - Story 5.4 `invoice.payment_failed` in overdue banner + log
  - Epic 6 stories
    - Story 6.1 Admin landing + nav scoped to ops role
    - Story 6.2 Service Fees read-only roll-up
    - Story 6.3 Overdue invoice queue
    - Story 6.4 Simulated-error toggle (non-prod)
  - Milestone
    - Feature-complete MVP in the integration environment
    - Ops playbook drafted by BA + QA

- **Weeks 28–29 · Sprint 13 · Hardening**
  - Cross-cutting work
    - Performance pass against NFR targets
    - Accessibility pass WCAG 2.1 AA
    - Snyk vulnerability sweep + remediation
    - Backfill test coverage gaps from story acceptance criteria
    - Load test on webhook router under concurrent delivery
  - Milestone
    - Release candidate 1 cut
    - UAT entry criteria met

---

# Phase 3 — Acceptance / UAT

- **Weeks 30–33 · UAT**
  - Preparation (week 30)
    - UAT environment refreshed from RC1
    - Pilot FH test accounts provisioned
    - UAT scripts packaged (BA-led)
    - QA regression pack frozen
  - Execution (weeks 31–32)
    - Pilot FH-led testing (2 pilot FHs in-person, 3 remote)
    - Internal Legacy.com product + ops UAT
    - Defect triage daily standup (PM + senior + QA + BA)
    - Parallel dev fix-sprint on defects
  - Sign-off (week 33)
    - Defect burn-down under agreed threshold
    - Product owner sign-off
    - Security sign-off
    - Legal sign-off on Connect Custom flow
  - Milestone
    - Go / no-go gate for pilot rollout

---

# Phase 4 — Rollout

- **Weeks 34–36 · Pilot Rollout**
  - Pre-flight
    - Stripe Connect live-mode KYB completed for pilot FHs
    - Production monitoring + alerting verified
    - Rollback plan rehearsed
  - Pilot go-live
    - 5 pilot FHs onboarded in sequence over 2 weeks
    - Daily ops standup for incident triage
    - Feature flags default-off for growth epics
  - Pilot stabilisation
    - Hotfix cadence agreed (senior + mid on-call rotation)
    - Pilot satisfaction survey issued

- **Weeks 37–40 · Progressive Rollout**
  - Cohort 2 (≈ 15 FHs) week 37–38
  - Cohort 3 (≈ 30 FHs) week 39
  - General availability week 40
  - Milestone
    - MVP declared GA
    - Project closure checkpoint
    - Retrospective + handover to BAU support
    - Growth roadmap kickoff planning begins

---

# Beyond MVP — Growth Roadmap (indicative, separately sized)

- **Weeks 41–60 · Parallel Growth Tracks**
  - Track A — Ops / Commercial
    - Epic 8 Automated Billing
    - Epic 12 Order Adjustments
  - Track B — User Experience
    - Epic 7 Order Wizard & Upsells
    - Epic 10 Loyalty Tier Experience
    - Epic 11 Notifications Centre & Preferences
    - Epic 9 Multi-User RBAC & Chain Accounts

---

# Critical dependencies and risk flags (parallel to all phases)

- Stripe KYB process for Connect Custom — block on rollout, not build
- Legacy.com platform team availability for Jenkins / AWS / Snyk / DBA requests
- Platform-convention validation outcome (end Sprint 1) — may force re-plan
- Loyalty tier thresholds pending commercial decision — required before Epic 4 Sprint 9
- Pilot FH cohort confirmation — required before Phase 3 UAT
- Stripe commercial terms — required before any live-mode activity
