# Research & Evidence Ledger — Ciel

**Project:** Ciel — AI-native Impact Operating System for the social sector
**Date:** 2026-06-25
**Version:** 1.0
**Owner:** Ciel Team — Create & Conquer 2026
**Status:** Locked
**Purpose:** The grounding backbone for the Ciel FMD suite. Every load-bearing claim used in the BRD / PRD / SDD / GTM / CLR must resolve to a row here. This ledger fact-checks [`Idea.MD.md`](../Idea.MD.md) against current, legitimate sources before any of it becomes a design or business commitment.

---

## How to read this

- **Verdict:** `Verified` (source confirms as stated) · `Partially-verified` (core true, a detail unconfirmed) · `Corrected` (claim was stale/wrong; restated value given) · `Flagged` (could not verify — kept OUT of core arguments).
- **Source tier** (per FMD/Crow discipline): **T1 Primary** (official org, gov, peer-reviewed) > **T2 Expert** (arXiv, encyclopedic, reputable analyst) > **T3 Journalistic** > **T4 Web**.
- **Retrieved:** 2026-06-25 for all rows unless noted.
- **Rule:** Only `Verified` / `Partially-verified` / `Corrected` claims are load-bearing. `Flagged` claims may be mentioned as "vendor-stated, unconfirmed" but never anchor the thesis.

---

## A. Market & sector thesis

| # | Claim (from Idea.MD.md) | Verdict | Grounded value & source |
|---|---|---|---|
| A1 | AI adoption in orgs is surging; "up to 72% using AI in ≥1 business function." | **Corrected** | The 72% figure is the **early-2024** baseline. Current **McKinsey State of AI 2025**: **88%** of orgs use AI in ≥1 function (up from 78%); **72% now = generative-AI adoption specifically** (up from 33%). T1 — McKinsey QuantumBlack, *The state of AI* (2025). |
| A2 | The sector identifies needs well but fails at solution→implementation→scaling ("implementation gap"). | **Verified (empirical support)** | McKinsey 2025: **~two-thirds of orgs have not begun scaling AI across the enterprise**; only **39% report enterprise-level EBIT impact**. This is direct quantitative support for the "adoption ≠ scaling" thesis. T1 — McKinsey 2025. |
| A3 | "Pilotitis" — pilots that show promise then fail to scale — is the core ICT4D pathology. | **Verified (established concept)** | Well-documented ICT4D term; drivers = financial unsustainability, ecosystem misalignment, infra limits, no scaling framework. T2/T3 — ICTworks; Frontiers in Digital Health / PMC "From pilot to policy" (2026). |
| A4 | Social-impact / nonprofit software is a large, growing, fragmented market. | **Verified (sized)** | Nonprofit software market ≈ **$4.95B (2026)**, → ~$7.24B by 2031 at **7.9% CAGR**; **APAC fastest-growing (~9% CAGR)**; cloud = ~78% of revenue. T3 — Mordor Intelligence, *Non-Profit Software Market* (2025–2031). (Other analysts give a similar $4.7–5.1B-2026 band — directional, not audited.) |

## B. Competitive landscape

| # | Claim | Verdict | Grounded value & source |
|---|---|---|---|
| B1 | Salesforce gives eligible 501(c)(3) nonprofits 10 free licenses ("Power of Us"). | **Verified** | Power of Us (P10) grants **10 free licenses** to eligible 501(c)(3)s; NPSP available as a free managed package. T1 — Salesforce Help (Power of Us / P10). |
| B2 | "Free like a puppy" — free license, expensive to implement/maintain; NPSP→Nonprofit Cloud migration friction ("person accounts"). | **Verified** | NPSP (Contacts/Accounts/Household model) vs **Nonprofit Cloud** (launched 2022 on Salesforce Industries schema) — a real, contentious migration. "Free like a puppy" is a documented community sentiment (freelikeapuppy.tech). T3/T4. |
| B3 | Enterprise nonprofit CRMs (Blackbaud Raiser's Edge, Bloomerang, Virtuous, Better Impact, Benevity) excel at money/relationships, not program execution / M&E. | **Verified (directional)** | Category structure confirmed across vendor sites + buyer guides; the *gap* (no cognitive help for intervention design + outcome evaluation) is the defensible market insight. T3/T4 — vendor sites, WifiTalents 2026 buyer's guide. |

## C. Consulting frameworks (Ciel's credibility scaffolding)

| # | Claim | Verdict | Grounded value & source |
|---|---|---|---|
| C1 | **BCG 10-20-70 rule**: 10% algorithms, 20% tech/data, 70% people & process. | **Verified** | Confirmed; "more than two-thirds of transformations fail due to change-management shortcomings." T1 — BCG, *The Leader's Guide to Transforming with AI*. |
| C2 | **BCG commits $500M to AI for social impact by end-2030, partnering with Anthropic (Claude).** | **Verified** | BCG press 4 Jun 2026: $500M by 2030; partnering with **Anthropic's Beneficial Deployments team** (Claude credits + training) for up to 20 social-impact orgs this year; builds on $1.5B+ since 2020. T1 — bcg.com/press/4june2026-ai-transform-social-impact. |
| C3 | **McKinsey "Rewired"**: six capabilities; internal GenAI assistant "Lilli." | **Verified** | Six capabilities = roadmap-tied-to-value, talent bench, operating model at pace, distributed/flexible tech, data embedded, adoption & scaling. Lilli = RAG over proprietary corpus, launched Jul 2023, ~45k staff. **Lilli's architecture (vector retrieval → 5–7 cited artifacts) is a reference pattern for Ciel's ToC engine.** T1 — McKinsey. |
| C4 | **Deloitte Trustworthy AI**: seven dimensions. | **Verified** | Transparent & explainable · fair & impartial · robust & reliable · respectful of privacy · safe & secure · responsible · accountable. T1 — Deloitte AI Institute. **Adopted as Ciel's governance spine (SDD NFRs + CLR + QAD).** |

## D. AI-in-social-sector proof points

| # | Claim | Verdict | Grounded value & source |
|---|---|---|---|
| D1 | IBM watsonx — UHCW NHS Trust saw ~700 extra patients/week. | **Verified** | IBM + Celonis + watsonx.ai; **~700 extra patients/week**; AI reviewed outpatient letters in ~18 hours vs ~4 years human-equivalent. T1 — ibm.com/case-studies (UHCW). |
| D2 | IBM watsonx — Blendow Group **70%** reduction in legal-doc analysis time. | **Corrected** | Actual figure is **90% less time** to summarize/analyze documents. T1 — ibm.com/case-studies/blendow-group. |
| D3 | Valorem Reply Grant-Writing Assistant cut proposal time **>80%** (Azure OpenAI / MS Tech for Social Impact). | **Partially-verified / Flagged metric** | The product is real (MS Tech for Social Impact + Valorem Reply; Teams-based, OpenAI-powered grant assistant). **The specific "80%+" figure was not found in primary sources** — use as "materially reduces proposal time (vendor-stated)", not a hard number. T3 — valoremreply.com. |

## E. Public sector / regulatory (Philippines-first)

| # | Claim | Verdict | Grounded value & source |
|---|---|---|---|
| E1 | PH government procurement is governed by **RA 9184** (Government Procurement Reform Act). | **Corrected — important** | **RA 9184 was repealed in full by RA 12009, the New Government Procurement Act (NGPA)**, signed 20 Jul 2024, effective 13 Aug 2024; **IRR approved Feb 2025**. NGPA: ~60-day target cycle, 11 new modalities, expanded SME preference, green procurement, PhilGEPS modernization, Competitive Dialogue for complex buys. **All Ciel B2G content must cite RA 12009, not RA 9184.** T1 — Library of Congress; DBM; GPPB. |
| E2 | Selling SaaS to PH government must run through PhilGEPS and standardized bidding. | **Verified** | PhilGEPS remains the mandated platform; NGPA modernizes it end-to-end. T1 — GPPB / PS-PhilGEPS. |
| E3 | PH data privacy obligations exist for handling personal/vulnerable data. | **Verified** | **Data Privacy Act of 2012 (RA 10173)**, effective 8 Sep 2012, enforced by the **National Privacy Commission (NPC)**; covers govt + private sector. **Anchors the CLR.** T1 — NPC (privacy.gov.ph); Official Gazette. |
| E4 | "Simplicity-first" procurement modernization (rewrite rules in plain language before automating). | **Verified (directional)** | Deloitte 2026 government-procurement trend: clarify/strip process first, then automate (US IRS/DoD examples). T1 — Deloitte Insights 2026. |

## F. Sizing inputs (Philippines)

| # | Input | Verdict | Grounded value & source |
|---|---|---|---|
| F1 | PH local government units (B2G addressable layer). | **Verified** | **81 provinces + 144 cities + 1,490 municipalities = 1,715 primary LGUs** (plus 42,028 barangays). SOM math uses the 1,715 figure. T1/T2 — Wikipedia/official lists (cross-checked). |
| F2 | PH NGOs register as non-stock, non-profit corporations with the SEC; PCNC accredits a subset. | **Verified (no single clean count)** | Registration path confirmed (SEC → BIR → LGU permits; PCNC accreditation optional). A precise national NGO count is not authoritatively published; SOM treats accredited + actively-operating mid-size NGOs as the beachhead and flags the count as an estimate. T3 — Council on Foundations; PCNC. |

---

## G. Net effect on the Ciel thesis

The fact-check **strengthens** the case rather than weakening it:

1. **The "implementation gap" is now empirically anchored** (A1/A2): adoption is near-universal (88%) but scaling is rare (~⅓) and value is rarer (39% EBIT). That is *exactly* the gap Ciel attacks.
2. **The market tailwind is real and timely** (A4 + C2): a sized, fast-growing, APAC-leading market, with BCG putting $500M + Anthropic/Claude behind precisely this problem in June 2026.
3. **The credibility scaffolding holds** (C1–C4, D1–D2): BCG 10-20-70, McKinsey Rewired/Lilli, Deloitte Trustworthy AI, and watsonx outcomes all check out — and Lilli's RAG pattern + Deloitte's seven dimensions become concrete design inputs.
4. **Two stale facts were caught before they shipped** (E1, D2/D3): the procurement law (RA 9184 → **RA 12009**) and the Blendow figure (70% → **90%**); the Valorem 80% is demoted to vendor-stated.

**Stack note (Stack Currency):** "Azure AI Foundry" is now **Microsoft Foundry** (Jan 2026 Product Terms); Foundry Agent Service (Responses API), Foundry IQ (managed RAG), and a multi-model control plane that *can* run **both Claude and GPT** — the only major cloud to do so. Ciel's own tenant exposes **only GPT**, so the runtime is **GPT-only** (cr-ciel-002); the BCG/Anthropic (C2) item remains a verified market-tailwind fact about the *sector*, independent of Ciel's model choice. Full detail in the SDD/BUILD.

---

## Sources (canonical links)

- McKinsey, *The state of AI* (2025) — https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai
- BCG, *AI to Transform Social Impact / $500M by 2030* (4 Jun 2026) — https://www.bcg.com/press/4june2026-ai-transform-social-impact
- BCG, *The Leader's Guide to Transforming with AI* (10-20-70) — https://www.bcg.com/featured-insights/the-leaders-guide-to-transforming-with-ai
- McKinsey, *Rewiring with Lilli* — https://www.mckinsey.com/capabilities/tech-and-ai/how-we-help-clients/rewiring-the-way-mckinsey-works-with-lilli
- Deloitte, *Trustworthy AI* — https://www.deloitte.com/us/en/what-we-do/capabilities/applied-artificial-intelligence/articles/trustworthy-ethical-ai-thought-leadership.html
- IBM, *UHCW NHS Trust* — https://www.ibm.com/case-studies/uhcw-nhs-trust · *Blendow Group* — https://www.ibm.com/case-studies/blendow-group
- Valorem Reply, *Grant Writing for Nonprofits with OpenAI* — https://valoremreply.com/resources/work/2024/august/grant-writing-with-openai/
- Mordor Intelligence, *Non-Profit Software Market* — https://www.mordorintelligence.com/industry-reports/non-profit-software-market
- Salesforce, *Power of Us (P10)* — https://help.salesforce.com/s/articleView?id=004754266
- RA 12009 (NGPA): Library of Congress — https://www.loc.gov/item/global-legal-monitor/2024-10-03/philippines-new-government-procurement-act-enters-into-force/ · GPPB — https://www.gppb.gov.ph/new-government-procurement-act-or-republic-act-no-12009/
- RA 10173 (Data Privacy Act) — https://privacy.gov.ph/data-privacy-act/
- Microsoft Foundry (Agent Service) — https://learn.microsoft.com/en-us/azure/foundry/agents/overview
