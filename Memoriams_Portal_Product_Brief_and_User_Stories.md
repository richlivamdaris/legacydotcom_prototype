# Memoriams Funeral Home Self-Serve Portal

## Product Brief & User Stories — Prototype Baseline

**Project:** Legacy.com Funeral Home Rewards & Billing Prototype
**Engagement:** 20–24 April 2026
**Prepared by:** Ben Coulson & Richard Livingstone (Amdaris), in partnership with Stripe
**Version:** 1.0 — Baseline for prototype build
**Classification:** Commercial in Confidence

---

## 1. Product Brief

### 1.1 Product Name

**Memoriams Portal** — the funeral home self-serve platform for Legacy.com's funeral home network.

### 1.2 One-Line Description

A single, real-time portal where funeral homes place obituary orders, manage billing, and earn and redeem loyalty rewards — replacing today's fragmented manual processes with a fully digitised Stripe-powered experience.

### 1.3 Vision

To transform the Memoriams network from an operationally expensive, manually administered billing relationship into a modern SaaS platform that funeral homes actively want to use — and that Legacy can scale, monetise, and report on with investor-grade financial infrastructure.

### 1.4 Strategic Context

Legacy.com received new investment in 2025. 2026 is a consolidation year — the funeral home network is the final and most complex piece of the platform consolidation before a growth phase in 2027. This portal is not just an efficiency project: it is the foundation for a clean, scalable, investor-ready platform with a loyalty programme that can be used to grow and retain the network.

The prototype built in this 5-day sprint is the proof point for the full SaaS build. Architecture is designed for production; scope of the prototype is a tight slice of the full vision.

### 1.5 Target Users

| User type | Description | Primary need |
|---|---|---|
| **Funeral director / owner** | Small funeral home, single location, owner-operator places orders personally | Quick order placement, visible cost, no billing admin |
| **Funeral home admin** | Mid-size funeral home, admin handles billing and ordering | Invoice visibility, payment management, account status |
| **Chain accounts team** | Multi-location chain with centralised accounts payable | Multi-user access, bulk invoice views, export for reconciliation |

*Note: the prototype focuses on the funeral home–facing experience only. Legacy admin views, newspaper settlement screens, and ODM operator screens are out of prototype scope.*

### 1.6 Core Value Propositions

1. **Real-time visibility** — funeral homes see their account balance, order status, invoices, and loyalty points in one place, live, with no phone calls or email chasing.
2. **Zero-friction billing** — automated monthly invoicing with payment on file, automated dunning, and account freeze on default. Finance teams are out of the loop for routine cases.
3. **Instant digital rewards** — loyalty points accrue automatically on every order placed, visible at order confirmation. Redemption is one click for a digital gift card — no cheques, no manual fulfilment, no delay.
4. **Transparent order adjustments** — when an obituary changes after placement (word count, upsells, cancellation), the funeral home is notified, sees the revised cost, and approves — the invoice is adjusted automatically.
5. **Upgrade pathway** — non-approved pre-pay funeral homes see a clear route to approved monthly-invoice status based on order volume.

### 1.7 The Three Pillars (Prototype Scope)

**Pillar 1 — Automated Billing**
Monthly invoicing for approved accounts with payment on file, automated dunning, and account freeze on overdue. Pre-pay capture for non-approved accounts via Stripe Payment Element. Dynamic order adjustments handled via invoice line items and credit notes.
*Stripe product: Stripe Billing + Payment Intents*

**Pillar 2 — Real-Time Account Portal**
Dashboard showing current balance, upcoming invoice, recent orders, loyalty points balance, and account status. Always current, always self-service.
*Stripe product: Stripe Billing API + Customer object*

**Pillar 3 — Digital Loyalty Programme**
Points accrue on every verified obituary placement. Funeral homes earn by placing orders, attending training, and volume milestones. Redemption issues a virtual card (or digital gift card via Tremendous as the alternate fulfilment path) instantly. Tiered partner status (Bronze / Silver / Gold) creates aspiration and stickiness.
*Stripe product: Stripe Issuing (Tremendous as backup if Issuing approval timeline is a blocker)*

### 1.8 Out of Scope for This Prototype

- Newspaper-side settlement and newspaper onboarding as Connect accounts (Phase 2)
- Legacy admin / ODM operator dashboards
- Consumer-facing obituary pages (that is legacy.com, not Memoriams)
- Live Stripe Connect Custom onboarding with real KYC (mocked in prototype)
- Real NetSuite sync (referenced in architecture, not built in prototype)
- Multi-tier loyalty with MCC spending controls (shown as direction, simplified in demo)

### 1.9 Architecture Summary

The full production architecture uses **Stripe Connect Custom** as the foundation, with **Stripe Billing** for invoicing, **Stripe Issuing** for loyalty, **Financial Connections** for bank verification, and the **Stripe NetSuite connector** for finance data sync. The prototype demonstrates the funeral home–facing surface of this architecture; the full architecture is documented separately for the board deck.

### 1.10 Success Criteria for the Prototype

| Measure | Target |
|---|---|
| Board approval to commission full build | Yes — with Amdaris selected as supplier |
| CFO confidence in commercial case | Clear ROI narrative: reduced finance FTE hours, eliminated cheque cost, faster cash cycle |
| Funeral home reaction in user walkthrough | "I want this" — demonstrable preference vs current process |
| Stripe SA endorsement | Architecture aligned with Stripe best practice and referenceable |

---

## 2. User Personas

### 2.1 Primary: Diane, Funeral Director / Owner

- Owns a single-location funeral home in Ohio. Has run it for 18 years.
- Places 15–25 obituaries per month with Legacy via the current Memoriams/AdPay system.
- Personally does most ordering — no dedicated admin.
- Mobile-first: uses her phone between visits with bereaved families.
- Pain: loyalty programme is invisible to her; she has never redeemed. Billing arrives by email PDF and she manually forwards to her bookkeeper.
- Success: sees her balance at a glance, places an order in under 2 minutes, knows exactly what she'll be charged.

### 2.2 Secondary: Marcus, Chain Accounts Manager

- Manages accounts payable for a 12-location funeral chain.
- Handles invoice approval, reconciliation, and payment for all 12 homes' Legacy activity.
- Needs to export data into the chain's ERP (they use Sage).
- Pain: consolidating 12 separate invoices manually each month; chasing up order adjustments that don't match placed orders.
- Success: sees all 12 locations in one place, downloads a single consolidated CSV, approves payments in bulk.

### 2.3 Tertiary: Sam, New Funeral Home Owner

- Opened a funeral home 4 months ago.
- Non-approved account — pre-pays per transaction by credit card.
- Placed ~30 orders to date, wants to qualify for approved status.
- Pain: clunky per-order payment flow; no visibility into what "approved" requires.
- Success: clear path to approved status, payment on file so pre-pay is seamless.

---

## 3. Information Architecture

### 3.1 Top-Level Navigation

```
MEMORIAMS PORTAL
├── Dashboard (home)
├── Orders
│   ├── Place new obituary
│   ├── In-flight orders
│   └── Order history
├── Billing
│   ├── Current balance
│   ├── Invoices
│   ├── Payment methods
│   └── Statements / export
├── Rewards
│   ├── Points balance & tier
│   ├── Earning history
│   ├── Redeem
│   └── My cards
└── Account
    ├── Organisation details
    ├── Users & permissions
    ├── Account status (approved / pre-pay)
    └── Upgrade pathway
```

### 3.2 Prototype Screen List (Figma)

The build team should produce these screens in Figma for the clickable prototype. Screens marked **★** are hero screens for the board demo.

1. **★ Dashboard / Home** — balance, upcoming invoice, recent orders, points balance, tier badge
2. **Order placement — step 1: obituary details** — deceased name, dates, text entry with word count
3. **Order placement — step 2: newspaper selection** — which papers, pricing per paper
4. **Order placement — step 3: upsells** — photo, candle, online memorial add-ons
5. **★ Order placement — step 4: review & submit** — total cost, points to be earned, confirm
6. **Order confirmation** — order ID, billing method applied, points earned (animated)
7. **★ Order adjustment notification** — price has changed, review revised cost, approve / dispute
8. **Order history / in-flight orders** — list view with status chips
9. **Invoice list** — monthly invoices with status (paid / due / overdue)
10. **★ Invoice detail** — line items per obituary, adjustments, payment status, PDF download
11. **Payment method management** — card on file, ACH, Financial Connections link bank
12. **★ Rewards dashboard** — points balance, current tier, progress to next tier, earning history
13. **★ Redeem flow — step 1: choose reward type** — digital gift card / account credit / CPD credit
14. **Redeem flow — step 2: confirm redemption** — points to deduct, value to receive
15. **★ Redemption confirmation — virtual card issued** — card details revealed, copy-to-clipboard
16. **My cards** — list of issued loyalty cards with remaining balance
17. **Account status** — approved / pre-pay indicator, upgrade CTA for pre-pay accounts
18. **Upgrade to approved account — application flow** — Financial Connections bank link, agree terms
19. **Pre-pay checkout (Stripe Payment Element)** — for non-approved accounts at order submission
20. **Login / onboarding** — SSO or email+password, first-time tour overlay

---

## 4. User Stories

Stories are grouped by epic, prioritised **P1 (must have for prototype demo)**, **P2 (should have)**, **P3 (roadmap / Phase 2)**.

### 4.1 Epic: Account & Onboarding

| ID | Priority | Story | Acceptance criteria |
|---|---|---|---|
| ACC-01 | P1 | As a funeral home user, I want to log into a single portal for all Memoriams activity, so I don't have to use multiple tools. | Login screen accepts email + password; successful login lands on Dashboard; session persists across tabs. |
| ACC-02 | P1 | As a funeral home user, I want to see my organisation's account status (approved / pre-pay) clearly, so I know how I'm being billed. | Status badge visible on Dashboard and Account page; explains what the status means in plain English. |
| ACC-03 | P2 | As a chain accounts manager, I want multi-user access with role-based permissions, so my team can share the workload. | Users can be invited; roles include Admin, Ordering, Accounts; permissions enforced in UI. |
| ACC-04 | P2 | As a pre-pay funeral home owner, I want a clear path to approved account status, so I can graduate to monthly invoicing. | Dashboard shows progress toward approval threshold; CTA launches application flow. |
| ACC-05 | P3 | As a new funeral home, I want to onboard with Legacy via Stripe Connect Custom including KYB, so I can receive settlements. | Onboarding via Stripe-hosted `account_links`; requirements tracked; payouts enabled once complete. |

### 4.2 Epic: Order Placement

| ID | Priority | Story | Acceptance criteria |
|---|---|---|---|
| ORD-01 | P1 | As a funeral director, I want to place an obituary order in under 3 minutes, so I can focus on the family. | 4-step wizard; form state preserved on back navigation; mobile-responsive. |
| ORD-02 | P1 | As a funeral director, I want to see the total cost before I submit, so I can confirm with the family. | Review screen shows line items, total, billing method, and points to be earned. |
| ORD-03 | P1 | As a funeral director, I want to see how many loyalty points I'll earn on this order, so the programme is visible at the point of decision. | Points preview shown on review screen; animation on confirmation screen when points accrue. |
| ORD-04 | P1 | As a funeral director, I want to select which newspapers to place the obituary in, so I can match the family's wishes. | Newspaper selector shows papers available in region with per-paper pricing; multi-select. |
| ORD-05 | P2 | As a funeral director, I want to add upsells (photo, candle, online memorial) during order placement, so I can offer the family more. | Upsell step shows available add-ons with preview and price; optional. |
| ORD-06 | P2 | As a funeral director, I want to save orders as drafts, so I can gather info from the family and finish later. | Draft state saved to user account; visible on Order history with "Resume" action. |
| ORD-07 | P1 | As a pre-pay funeral home owner, I want to pay by card at the point of submission, so my obituary can be placed immediately. | Stripe Payment Element embedded at step 4; `PaymentIntent` captured on submit; receipt emailed. |
| ORD-08 | P2 | As a pre-pay funeral home owner, I want to save my card for future orders, so I don't have to re-enter details. | Card saved via Stripe Customer + PaymentMethod; "Use saved card" option on subsequent orders. |

### 4.3 Epic: Order Adjustments (Dynamic Pricing)

| ID | Priority | Story | Acceptance criteria |
|---|---|---|---|
| ADJ-01 | P1 | As a funeral director, I want to be notified when an obituary's price changes after I placed it, so I'm never surprised on the invoice. | In-portal notification and email on order modification; shows before/after pricing and reason. |
| ADJ-02 | P1 | As a funeral director, I want to approve or dispute a price change, so I stay in control of what I pay. | Notification screen includes Approve and Dispute actions; approval updates invoice line item; dispute raises a flag. |
| ADJ-03 | P2 | As a funeral director, I want to cancel an obituary before publication, so I can recover the cost if the family changes plans. | Cancel action available on in-flight orders; triggers credit note or refund depending on state. |
| ADJ-04 | P2 | As a funeral director, I want to see the full adjustment history on an order, so I can audit what changed and when. | Order detail page shows timeline of all modifications with amount, reason, and approver. |
| ADJ-05 | P3 | As Legacy finance, I want every adjustment to have a full audit trail in Stripe, so month-end close is defensible. | All adjustments recorded as `invoice_item` / `credit_note` with `metadata.order_id`; queryable in Sigma. |

### 4.4 Epic: Billing & Invoicing

| ID | Priority | Story | Acceptance criteria |
|---|---|---|---|
| BIL-01 | P1 | As an approved funeral home, I want to see my current balance and next invoice on my Dashboard, so I know what I owe at all times. | Balance widget shows current month accrued; next invoice date and estimated total. |
| BIL-02 | P1 | As an approved funeral home, I want to receive an automated monthly invoice, so my finance team has predictable paperwork. | Stripe Billing generates invoice on schedule; email sent; PDF available in portal. |
| BIL-03 | P1 | As an approved funeral home, I want to pay by card on file automatically, so I never miss a payment. | `auto_advance: true` on finalised invoice; charge attempted on due date; success/failure notified. |
| BIL-04 | P1 | As a funeral home user, I want to download a PDF of any invoice, so I can file it for my records. | Invoice detail page has "Download PDF" button; file matches Stripe invoice. |
| BIL-05 | P2 | As an overdue account, I want automated reminder emails before my account is frozen, so I have a chance to pay. | Dunning schedule configurable; 3 reminder stages; account freeze at day 30 overdue. |
| BIL-06 | P2 | As a frozen account, I want clear in-portal guidance on how to restore service, so I know exactly what to do. | Frozen state banner on Dashboard; CTA to pay outstanding balance; restores access automatically on payment. |
| BIL-07 | P2 | As a chain accounts manager, I want to export a consolidated CSV of invoices across all my locations, so I can reconcile in my ERP. | Export action with date range filter; CSV includes location, invoice ID, line items, amount, status. |
| BIL-08 | P3 | As Legacy finance, I want all Stripe billing activity to sync to NetSuite automatically, so month-end close is streamlined. | Stripe native NetSuite connector configured; invoices, payments, refunds sync daily. |

### 4.5 Epic: Loyalty — Earning

| ID | Priority | Story | Acceptance criteria |
|---|---|---|---|
| LOY-01 | P1 | As a funeral home user, I want to see my current loyalty points balance on my Dashboard, so the programme is always visible. | Points widget on Dashboard with balance and tier badge. |
| LOY-02 | P1 | As a funeral home user, I want to see my current tier (Bronze / Silver / Gold) and progress to the next tier, so I'm motivated to engage. | Tier visualisation with progress bar; next tier threshold shown in points. |
| LOY-03 | P1 | As a funeral home user, I want to see how many points each order earned, so the programme feels tangible. | Points animation on order confirmation; earning line item on Rewards history. |
| LOY-04 | P1 | As a funeral home user, I want to see my full earning history, so I can verify I've been credited correctly. | Earning history list: date, order ref, points earned, reason. Filterable by date range. |
| LOY-05 | P2 | As Legacy, I want to award bonus points for non-order activities (training attended, feedback, monthly top earner), so the programme drives desired behaviour. | Admin-triggered manual accruals; visible in earning history with reason label. |
| LOY-06 | P2 | As a funeral home user, I want notifications when I hit a points milestone (next tier reached, redemption threshold), so I don't miss opportunities. | Portal notification + email at configurable thresholds. |

### 4.6 Epic: Loyalty — Redemption

| ID | Priority | Story | Acceptance criteria |
|---|---|---|---|
| RED-01 | P1 | As a funeral home user, I want to redeem my points for a reward of my choice, so the programme feels rewarding. | Redeem flow: choose reward type (digital gift card / account credit / CPD), confirm points deduction, receive reward. |
| RED-02 | P1 | As a funeral home user, I want to receive a digital Visa card instantly on redemption, so there's no delay like with cheques. | Stripe Issuing `cardholder` + `card` created on redemption; card details shown on success screen. |
| RED-03 | P1 | As a funeral home user, I want to see all my issued loyalty cards with remaining balance, so I can track and use them. | My Cards page lists issued cards; balance updated from Stripe Issuing API. |
| RED-04 | P2 | As a funeral home user, I want to redeem points as account credit against my next invoice, so there's zero friction in using the value. | Redemption as credit adds a line item to the upcoming invoice; confirmation screen shows new invoice total. |
| RED-05 | P2 | As a Gold-tier funeral home, I want to redeem points for CPD credits or event access, so the programme rewards my professional development. | CPD redemption option visible at Gold tier only; fulfilment via voucher code or event registration link. |
| RED-06 | P3 | As Legacy, I want spending controls on issued loyalty cards (MCC limits, velocity caps), so the programme is safe at scale. | `spending_controls` set on Issuing cards per redemption tier. |

### 4.7 Epic: Notifications & Communication

| ID | Priority | Story | Acceptance criteria |
|---|---|---|---|
| NOT-01 | P1 | As a funeral home user, I want in-portal notifications for order, billing, and rewards events, so I don't miss anything. | Bell icon with unread count; dropdown lists recent notifications with deep links. |
| NOT-02 | P2 | As a funeral home user, I want email notifications for critical events (invoice issued, price change, redemption success), so I'm informed even when I'm not logged in. | Email templates branded; sent on key events; preference centre to manage opt-ins. |
| NOT-03 | P3 | As a funeral home user, I want SMS alerts for urgent events (account freeze imminent), so I can act fast. | SMS opt-in at account setup; triggered on dunning stage 3 and freeze events. |

---

## 5. Key Flows (Detail for Prototype)

### 5.1 Hero Flow: Place Order → Earn Points → Redeem

This is the flow the board demo will centre on. It must feel frictionless, visually polished, and commercially compelling.

1. Diane opens the portal on her phone. Dashboard shows balance ($420 accrued this month), 8,450 points, "Silver tier — 1,550 points to Gold".
2. She taps "Place obituary". 4-step wizard. Enters details, selects 2 local papers and 1 out-of-area paper.
3. Review screen: total $295. "You'll earn 125 points on this order." Confirm.
4. Confirmation: order placed. Points animate from 8,450 → 8,575. Tier progress bar updates.
5. 2 days later, she gets a notification: "Your obituary for Robert Hayes has been adjusted — new total $315 (+$20 for extended word count)." She taps Approve.
6. End of month: invoice auto-generated. Card on file charged. Receipt in inbox.
7. 3 months later, she hits Gold tier. Notification: "You've reached Gold — redeem 5,000 points for a $50 Amazon gift card, or claim a free CPD course."
8. She taps Redeem, chooses gift card. Confirmation screen reveals her virtual card details instantly.

### 5.2 Pre-pay Flow: Non-Approved Account Order with Upgrade Prompt

1. Sam (pre-pay account) places an order. At the review step, payment method is Stripe Payment Element.
2. He uses his saved card; order placed.
3. Dashboard shows: "You've placed 30 orders in 4 months. You qualify for an approved monthly account. Apply now."
4. He clicks Apply. Financial Connections flow links his bank account. Agrees terms. Status changes to "Approved — pending review".

### 5.3 Order Adjustment Flow: Dynamic Pricing Handled Gracefully

1. An in-flight order is modified by Legacy (or by the newspaper) — typically a word count increase, cancellation, or upsell.
2. Funeral home receives notification: "Your order has been adjusted. Review the new total."
3. Adjustment screen shows: original cost, new cost, diff, reason, new points earning.
4. Funeral home approves (creates Stripe invoice line item) or disputes (raises flag to Legacy ops).
5. Approved adjustments roll into the next monthly invoice automatically.

---

## 6. Design & Brand Notes

- Use **Memoriams brand** primary (blues, navy) from existing loyalty PDF and Memoriams.com. Legacy.com brand is secondary — this is the funeral-home-facing product.
- **Tone: professional, respectful, modern.** The audience is licensed funeral professionals serving grieving families. Avoid anything gimmicky or over-gamified in the rewards UI — points should feel tasteful, not like a mobile game.
- **Mobile-first.** Diane's persona is primary. Desktop is essential for Marcus and chain users, but the hero flow must work beautifully on phone.
- **Accessibility.** Colour contrast AA minimum. Clear typography. Many users are 50+.

---

## 7. Open Questions for Day 1 Client Call

These affect prototype scope. Answers needed before Day 2.

1. Is auto-charge on payment-on-file the correct model for approved accounts, or do some require invoice approval before charge?
2. What is the existing Stripe footprint for the funeral home network specifically? Any saved cards, customers, webhooks already in place?
3. Is loyalty genuinely starting from scratch, or is historical points data to be migrated?
4. Does the Memoriams platform today expose APIs we can integrate with, or are we building the portal as a standalone SaaS layer fed by data sync?
5. How frequently are obituary orders amended after initial placement? If >40%, the adjustment flow becomes a P1 hero screen.
6. What are the CFO's top 2 commercial metrics for success? (Finance FTE hours saved, cheque cost eliminated, cash cycle compressed, redemption rate up — pick the top ones to anchor the Friday deck.)

---

## 8. Handover Notes for Ed Joy (UX)

- Start with the screen list in Section 3.2 — the ★ screens are the demo hero flow.
- Brand assets: pull from Memoriams.com and the loyalty PDF in project files. Legacy.com brand for reference only.
- Prioritise mobile design for the hero flow; desktop for admin-style screens (invoice list, chain manager views).
- Figma Make is the tool of choice for rapid high-fidelity prototyping. Miro holds the flows and artefacts for the board deck.
- Keep the rewards UI tasteful — no confetti, no cartoon badges. Think premium B2B (Henry Schein, Batesville BetterBusiness) not consumer loyalty app.

---

*Document end. This brief is the baseline for the Figma prototype and will be iterated through Days 2–4 of the sprint.*
