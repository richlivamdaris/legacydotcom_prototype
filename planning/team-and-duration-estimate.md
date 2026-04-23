---
title: Obituaries Portal — Team Size & Duration Estimate
project: legacydotcom_prototype
scope: MVP only (Epics 1–6, 51 stories). Growth (Epics 7–12) sized separately.
generated: 2026-04-23
confidence: Order-of-magnitude. Ranges, not point estimates.
---

# 1. Scope being estimated

| Facet | Value |
|---|---|
| Epics in scope | 1–6 (MVP) |
| Stories in scope | 51 |
| Rough story-point sum | **~250 SP** (blended 1/2/3/5/8/13 Fibonacci) |
| Epics deferred to a later release train | 7–12 (30 stories, sized separately when MVP is in pilot) |
| Tech stack | Spring Boot + JSP/JSTL + jQuery UI + MySQL + Hibernate + Stripe Java SDK on AWS EC2 (brownfield monolith module) |
| New-territory risk areas | Stripe Connect Custom, Stripe Issuing on Connected Accounts, bidirectional persistent idempotency, append-only audit, Hibernate `@Filter` tenancy |
| Out of scope of this estimate | Stripe KYB / production compliance work, PCI attestation, Legacy.com platform-team effort (Jenkins, AWS, DBA), Growth epics |

**Assumption snapshot**

- Discovery kickoff is short because PRD + Architecture + Epics already exist.
- Senior dev absorbs Tech Lead role — no separate architect seat.
- QA is one senior generalist covering integration, Stripe-test-mode scripting, and UAT support.
- BA + PM are 1.0 FTE each during build; can flex down during rollout.
- No existing Stripe Connect Custom experience on the team → ramp-up premium in Sprints 1–2 on Epic 1.
- 2-week sprints. Velocity stabilises after the ramp-up window.

---

# 2. Sizing model

**Throughput assumption**

- Pair of Java devs (1 senior + 1 mid) on this stack ≈ **18–22 SP/sprint** at steady state.
- Ramp-up sprints (first two) ≈ **12 SP/sprint** — scaffolding, platform-convention validation, Stripe Connect learning curve.
- A third dev adds ~8–10 SP/sprint *after* the foundation stories (1.1–1.8) have landed, because those are serial and can't be parallelised.

**Calendar overhead on top of pure build**

- Discovery kickoff: ~3 weeks
- Hardening / bugfix sprint at end of build: 2 weeks
- UAT: 4 weeks (with a parallel dev fix-sprint)
- Rollout (pilot + progressive): 4–6 weeks

**Sensitivity — what swings the number**

| Risk | Direction | Size of swing |
|---|---|---|
| Senior dev has prior Stripe Connect Custom production experience | **Faster** | –3 to –4 weeks |
| Platform-convention validation (Story 1.1) surfaces major rework | **Slower** | +4 to +8 weeks |
| KYB / Stripe commercial terms delay pilot FH onboarding | **Slower (blocks rollout, not build)** | +2 to +8 weeks |
| Growth-epic pressure from stakeholders mid-build | **Slower** | +2 weeks per absorbed growth story |
| Tier thresholds and loyalty mechanics change after Epic 4 starts | **Slower** | +1 to +3 weeks |

---

# 3. Recommended team size (ideal, independent of your proposal)

For a brownfield Spring Boot monolith module doing fintech-adjacent Stripe Connect + Issuing work, the healthy shape is:

| Role | Count | Why |
|---|---|---|
| Tech Lead / Senior Java dev | 1 | Stripe architecture ownership, code-review gatekeeping, risk decisions |
| Mid Java devs | 2 | Full-stack on JSP/Spring; can parallelise after foundation lands |
| Senior QA | 1 | Integration + Stripe test-mode + Stripe CLI scripting + UAT support |
| Business Analyst | 1 | Requirements ownership, FH stakeholder management, UAT orchestration |
| Project / Delivery Manager | 1 | Sprint cadence, Stripe commercial dependency, pilot coordination |
| **Total** | **6 FTE** | |

**Shared services assumed available but not on the team:** Legacy.com platform / DevOps team (Jenkins, AWS EC2, Snyk, MySQL DBA), legal & compliance (KYB / PCI attestation), product design (existing Memoriams UX system is the reference).

---

# 4. Your stated team — 2 Java devs (1 senior + 1 mid), 1 QA, 1 BA, 1 PM

**Headcount: 5 FTE**

| Metric | Estimate |
|---|---|
| MVP build (Sprints 1–14) | **~28 weeks** |
| Discovery kickoff (pre-build) | +3 weeks |
| Hardening sprint | +2 weeks |
| Acceptance / UAT | +4 weeks (parallel dev fix-sprint) |
| Rollout (pilot → progressive) | +4–6 weeks |
| **End-to-end** | **~10.5–11.5 months** |
| **Confidence** | Order-of-magnitude; ±2 months realistic, ±3 months in worst case |

**Feasibility call — yes, this team can do it.** The estimate holds on two conditions:

1. The senior absorbs the Tech Lead role cleanly and does not also get pulled 50% onto another project.
2. The platform-convention validation (Story 1.1) does **not** surface a fundamental mismatch with Legacy.com's existing Spring Boot conventions. If it does, expect 4–8 additional weeks on Epic 1 alone.

**Principal risk with this shape: bus factor = 1.** The senior is the only person with end-to-end Stripe Connect + Issuing context. Plan for:

- Pair rotation from Sprint 3 onwards so the mid dev builds Connect expertise.
- Documented Architecture Decision Records (ADRs) for every Stripe-touching story.
- Formal knowledge-transfer checkpoints at end of Epic 1, Epic 3, and Epic 4.

**Where this team will feel stretched:**

- Epic 1 (18 stories) is front-loaded — expect both devs on foundation work through Sprint 4. BA and QA will have lighter weeks here; use that time for UAT planning, FH-pilot onboarding packs, Stripe test-card script authoring.
- Epic 4 Story 4.5 (Redeem points via Stripe Issuing on Connected Account) is the single heaviest story. Plan to devote a full sprint to it with senior leading and mid pairing. Don't let other work pile onto the same sprint.

---

# 5. Proportionate team alternatives

## 5a. Minimum viable team — if budget is the hard constraint

**1 senior Java dev + 0.5 mid dev + 0.5 QA + 0.5 BA + 0.5 PM = ~3 FTE blended**

| Metric | Estimate |
|---|---|
| End-to-end MVP | **~15–18 months** |
| Bus factor | 1 (senior dev) |
| Recommended? | **No** for fintech + brownfield scope. Only acceptable if client agrees to a multi-phase de-risked release (e.g. onboarding-only Phase 1, then billing, then loyalty). |

Why it's dangerous: every Stripe webhook bug, idempotency edge case, or platform-convention surprise lands on one person. Velocity drops sharply during any illness or leave. The compliance + audit cross-cutting stories become sequential single-threaded work.

## 5b. Right-sized team (recommended if you can get it)

**1 senior + 2 mid devs + 1 QA + 1 BA + 1 PM = 6 FTE** — the "ideal" shape from §3.

| Metric | Estimate |
|---|---|
| MVP build (Sprints 1–11) | **~22 weeks** |
| Discovery kickoff | +3 weeks |
| Hardening | +2 weeks |
| UAT | +4 weeks |
| Rollout | +4–6 weeks |
| **End-to-end** | **~9–10 months** |
| **Delta vs stated team** | **–1.5 to –2 months faster** + better bus factor |

What the extra dev unlocks:

- Starts on Sprint 3 after foundation (Stories 1.1–1.8) lands. Parallel stream: Epic 2 listing model + pre-pay invoicing while primary stream continues Epic 1 Connect Custom work.
- Frees the senior to focus on Stripe Issuing (Epic 4) design earlier, reducing rework risk on the heaviest story in the project.
- Halves bus factor during Epic 3 monthly billing aggregation — two devs independently capable of shipping webhook handlers.

## 5c. Accelerated team — if schedule is the hard constraint

**1 senior + 3 mid devs + 2 QA + 1 BA + 1 PM = 8 FTE**

| Metric | Estimate |
|---|---|
| End-to-end MVP | **~7–8 months** |
| Caveat | **Diminishing returns beyond this shape.** Epic 1 foundation is sequential; a 4th dev cannot be fully productive until Sprint 5. Senior becomes a code-review bottleneck without a formal second-reviewer rotation. |
| Recommended? | Only if there's a hard external deadline (e.g. a commercial launch date) that justifies the extra coordination overhead. |

## 5d. Growth roadmap (Epics 7–12)

Once MVP is in pilot, the 6 Growth epics (30 stories) are roughly **4 months of additional delivery** for a stable 5–6 FTE team, run as two concurrent tracks:

- Track A (ops / commercial): Epic 8 Automated Billing + Epic 12 Order Adjustments
- Track B (user experience): Epic 7 Wizard + Epic 10 Tier Experience + Epic 11 Notifications + Epic 9 RBAC/Chains

These are largely independent of each other and of MVP production code, so two parallel 2-dev streams are productive here in a way they aren't during Epic 1.

---

# 6. Summary table — pick your scenario

| Scenario | Team | End-to-end (MVP) | Risk |
|---|---|---|---|
| **Minimum viable** (5a) | 3 FTE blended | 15–18 months | High (bus factor, long elapsed risk) |
| **Your stated team** (4) | 5 FTE | **10.5–11.5 months** | Medium (bus factor = 1, feasible with discipline) |
| **Right-sized** (5b — recommended) | 6 FTE | 9–10 months | Low–medium (best value for money) |
| **Accelerated** (5c) | 8 FTE | 7–8 months | Medium (coordination overhead, diminishing returns) |

---

# 7. Key caveats

- These numbers are order-of-magnitude, not commitments. Re-estimate after Sprint 2 using actual velocity.
- The platform-convention validation report (Story 1.1) is the biggest unknown. If it comes back clean, the stated team delivers at the lower end of the range; if it surfaces significant mismatch, every scenario grows by 4–8 weeks on Epic 1.
- Stripe KYB production readiness for Connect Custom is a parallel workstream led by Legacy.com legal/compliance. A slow KYB process can block pilot rollout even if build finishes on time — raise this as a critical-path dependency in the PM's risk register from Day 1.
- The estimate assumes feature-flagged progressive exposure (per NFR22) so unfinished growth epics do not block MVP rollout.
