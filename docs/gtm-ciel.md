# Go-To-Market (GTM) Strategy

**Project:** Ciel — AI-native Impact Operating System for the social sector
**Date:** 2026-06-25
**Version:** 1.0
**Owner:** Ciel Team — Create & Conquer 2026
**Status:** Locked
**Last reconciled:** 2026-06-25
**PRD:** [prd-ciel.md](prd-ciel.md) · **BRD:** [brd-ciel.md](brd-ciel.md) · **Evidence:** [evidence-ciel.md](evidence-ciel.md)

---

## 1. Product Summary (GTM View)

**What it does (one sentence):** Ciel turns a social need into a rigorous, funded, and continuously evaluated intervention — the operating layer between *need identified* and *solution scaled*.

**Who it's for:** the **"missing middle"** — mid-sized NGOs, regional advocacy groups, and progressive LGUs that need digital transformation but can't afford Big-Four consultants or full-time Salesforce admins ([evidence A4, B2, F1](evidence-ciel.md)).

**Core value proposition:** *Design a fundable program in an afternoon — and know in time whether to scale, adapt, or stop.* Incumbents manage the money; Ciel designs and proves the mission.

**Category:** Impact Operating System (program design + grant funding + predictive M&E) — a new category adjacent to, not competing head-on with, nonprofit CRM.

---

## 2. Target Audience

**Primary ICP:**
- *Who:* program managers + executive directors at 10–100-person Philippine NGOs running livelihood, education, health-access, or disaster-resilience programs (persona Maria, [PRD §2](prd-ciel.md)).
- *Where they are:* PCNC-accredited NGO networks, foundation grantee cohorts, LGU planning offices, Facebook groups, sector conferences, university extension programs (incl. FEU/DOST networks).
- *What they already believe:* grant reporting and M&E are crushing busywork; "free" enterprise CRMs cost a fortune to run ([evidence B2](evidence-ciel.md)).
- *What makes them try it:* seeing a real ToC + matched grant draft generated from *their own* need in minutes.

**Secondary audiences:**
- **Progressive LGUs** — buy compliance, speed, and audit-ready evidence for public funds (longer B2G cycle; §5).
- **Foundations / CSR portfolios** — mandate Ciel across grantees for standardized, comparable impact reporting (a wedge that distributes Ciel top-down).

---

## 3. Pricing Model

**Model:** `Freemium` → value-based scaling (deliberately **not** per-seat, which penalizes orgs as they grow volunteers).

| Tier | Price | What's Included | Limit / Gate |
|------|-------|-----------------|--------------|
| **Ciel Start** | ₱0 | ToC generator (PRD-F1) + 1 active project + community evidence corpus | 1 project; basic export |
| **Ciel Scale** | value-based (e.g., tied to funding *managed*, not seats) | Grant module (F2) + predictive M&E (F3) + multi-project + reports | per funding volume / projects |
| **Ciel Public (B2G/Foundation)** | annual contract | org-wide rollout, compliance exports, SSO, support, audit trails | procurement-based |

**Pricing rationale:** the free ToC tier delivers the "aha" before any spend ([BRD-M1](brd-ciel.md)); revenue lands at the implementation/scaling tiers, tied to value created (funding secured/managed, [BRD-M5](brd-ciel.md)) — aligning Ciel's success with the org's sustainability and sidestepping the seat-tax that punishes growth.

**Payment processor:** PH-friendly processor (e.g., PayMongo/Xendit) for subscriptions; B2G via procurement contract (no card).

---

## 4. Positioning & Messaging

**Tagline:** `From pilot to scale.`

**Primary message (hero):** *The social sector is brilliant at finding problems and stuck at scaling solutions. Ciel is the operating system that turns a need into a rigorous plan, a funded grant, and a live signal that tells you when to scale — or stop.*

**Proof points (all grounded — see [evidence-ciel.md](evidence-ciel.md)):**
- The gap is real: **88% of orgs use AI, ~two-thirds haven't scaled it, only 39% see impact** (McKinsey 2025).
- The tailwind is real: **BCG committed $500M to AI for social impact, partnered with Anthropic/Claude** — the same social-impact-AI bet Ciel is built on; Ciel runs on **Microsoft Foundry (GPT)**.
- The method is proven: built on **BCG 10-20-70, McKinsey Rewired, Deloitte Trustworthy AI**; AI-in-social outcomes like **+700 patients/week (IBM watsonx, UHCW)**.

**Objection handling:**

| Objection | Response |
|-----------|----------|
| "We already use Salesforce/Bloomerang." | Ciel is the *brain*, not the bank account — it designs and proves programs; keep your CRM for donors (v2 integrations planned). |
| "AI can't be trusted with vulnerable people's data." | Grounded-only outputs, human-in-the-loop on every decision, Deloitte's 7 Trustworthy-AI dimensions, PH Data Privacy Act compliance — trust is the product. |
| "Government procurement is impossible." | We sell compliance + speed, build to **RA 12009 + PhilGEPS** from day one, and start with the free NGO tier to prove value first. |
| "We have no IT team." | Opinionated, intuitive, works on low connectivity and even SMS — no admin required. |

---

## 5. Launch Channels & Tactics

**Owned channels:**

| Channel | Audience | Planned Action |
|---------|----------|----------------|
| Create & Conquer 2026 demo + pitch | judges, mentors, peers | live demo of the design→fund→scale flow; teaser video |
| Team/university networks (FEU, DOST, ICpEP) | students, faculty, NGO contacts | warm intros to pilot NGOs/LGUs |

**Community / earned channels:**

| Channel | Tactic | Timing |
|---------|--------|--------|
| PCNC / NGO networks | a free ToC clinic for 5–10 NGOs (concierge onboarding) | post-hackathon |
| Foundations / CSR | pitch "standardized impact reporting across your grantees" | pilot phase |
| Progressive LGU (1 friendly municipality) | compliance/speed pilot under RA 12009 framing | after NGO proof |
| Consulting channel (MBB/Big-Four social practices) | position Ciel as the tool consultants leave behind ([evidence C2/C3](evidence-ciel.md)) | growth phase |

**Content assets needed before launch:**
- [ ] 60–90s demo video — the three-module flow on one real PH need
- [ ] Landing page with the grounded proof points + clear CTA (free ToC)
- [ ] One-page brief mapping to the hackathon project-brief format
- [ ] Standalone README + how-to (required for code submission)
- [ ] 30-second teaser video (finals deliverable)

---

## 6. Launch Phases

| Phase | Criteria to Enter | Target Date | Goal |
|-------|------------------|-------------|------|
| **Alpha (private)** | core ToC slice complete; QA sign-off | hackathon build (by 29 Jun 2026) | working prototype; demo-ready |
| **Beta (concierge)** | post-hackathon; no P0; AI safety gate passed | Q3 2026 | 5–10 NGOs run a real ToC + connect a data source ([BRD-M3](brd-ciel.md)) |
| **Public (PH)** | retention validated; pricing live; **CLR cleared — DPO designated, PIA done, no open §3 counsel flags** ([clr-ciel.md](clr-ciel.md)) | when CLR clears | 25 activated orgs ([BRD-M3](brd-ciel.md)) |
| **B2G / Foundation** | NGO proof + RA 12009/PhilGEPS readiness | 2027 | first LGU/foundation contract |

> **Gate:** public launch is blocked until the CLR §3 counsel flags clear — non-negotiable given vulnerable-population data.

---

## 7. Success Metrics (post-launch, traced to BRD)

| BRD-M# | Metric | Target | How to Measure (event / source) |
|--------|--------|--------|----------------------------------|
| BRD-M1 | Time to first ToC | < 30 min | `toc_generated` latency (PRD §5.5) |
| BRD-M2 | Grant drafting time reduction | ≥ 60% | `grant_drafted` draft_time vs baseline |
| BRD-M3 | Activated orgs | 25 (12 mo) | `toc_locked` + `data_source_connected` |
| BRD-M4 | Projects with live M&E loop | 50 (12 mo) | `mande_signal_fired` distinct projects |
| BRD-M5 | Return on Mission (funding managed) | ₱50M (12 mo) | `funding_recorded` sum |
| BRD-M6 | Pilot-to-scale conversion | ≥ 20% (18 mo) | `project_scaled` / active projects |

---

## Self-Check
- [x] §2 ICP is specific enough to name real candidate orgs (PCNC NGOs, a friendly LGU, FEU/DOST contacts)
- [x] §3 pricing gate (free ToC → value-based scaling) drives conversion without a seat tax
- [x] §5 content assets listed and tied to hackathon deliverables
- [x] §6 phase criteria are binary; public launch gated on CLR clearance
- [x] §7 metrics trace to BRD-M# and name the PRD §5.5 event/source
- [x] Drafted before launch, not as a retrospective
