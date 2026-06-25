# Compliance & Legal Readiness Register (CLR)

**Project:** Ciel — AI-native Impact Operating System for the social sector
**Date:** 2026-06-25
**Version:** 1.0
**Owner:** Ciel Team — Create & Conquer 2026
**Status:** Locked
**Last reconciled:** 2026-06-25
**PRD:** [prd-ciel.md](prd-ciel.md) · **SDD:** [sdd-ciel.md](sdd-ciel.md)

---

> 🚩 **COUNSEL REQUIRED BEFORE PRODUCTION.** Ciel processes data about **vulnerable populations** (program beneficiaries), likely including **sensitive** (health/livelihood) and possibly **children's** data, and performs **systematic monitoring** of intervention cohorts. Section 3 has active escalation flags. **A Philippine privacy lawyer + a designated Data Protection Officer must review before any real beneficiary data is processed.**

> ⚠️ **Structural and regulatory awareness only — NOT legal advice.** This register maps obligations and surfaces what needs counsel; it does not draft your Privacy Policy/ToU and does not replace a licensed attorney. *(Per FMD rule + the user's Philippines-first global default.)*

---

## 0. Target Markets

| Region | In scope? | Notes |
|--------|-----------|-------|
| European Union / UK (GDPR) | **No (V1)** | Not a launch market; if the web app is globally reachable, geo-restrict pilot access to PH (below). |
| California, USA (CCPA/CPRA) | **No (V1)** | Same — out of scope for the PH beachhead. |
| **Philippines (Data Privacy Act 2012, RA 10173)** | **Yes** | Primary market: NGOs + LGUs. Governs all processing. Enforced by the National Privacy Commission (NPC). [evidence E3](evidence-ciel.md) |
| Public-sector procurement (B2G) | **Yes (regulatory, not privacy)** | Selling to LGUs falls under **RA 12009 (New Government Procurement Act)** + PhilGEPS. [evidence E1–E2](evidence-ciel.md) |

**Geo-blocking:** pilot restricts sign-up to Philippine organizations; treat PH DPA as the governing regime. Re-open this register before entering any new region.

---

## 1. Data Inventory / Record of Processing

| Activity | Purpose | Data categories | Data subjects | Recipients / sub-processors | Cross-border | Retention | Legal basis (PH DPA) |
|----------|---------|-----------------|---------------|------------------------------|--------------|-----------|----------------------|
| Authentication | account access | email, hashed pw, display name | org staff | Supabase (Auth) | possible (host region) → prefer PH/Asia region | until account deletion | consent / contract |
| Org & project data | core product | org mission, project/ToC content | org staff | Supabase (DB) | as above | per-org policy | contract / legitimate interest |
| **Field M&E data** | impact tracking | program indicators; **possibly sensitive** (health/livelihood) and **possibly children's** data; phone numbers (hashed) | **beneficiaries** | Supabase (DB), SMS gateway | as above | per-org policy; minimize | **consent of subjects (collected by the org)** + org accountability |
| AI generation | ToC/grant/signal | prompts + retrieved evidence + **minimized** org context (no raw subject PII) | org staff | **Microsoft Foundry** (GPT) | model region — set to a data-zone consistent with PH posture | not retained for training (enterprise terms) | legitimate interest |
| Analytics | product improvement | event data, no PII in properties | org staff | PostHog (self-host option) | self-host avoids transfer | 30 days | legitimate interest |
| Crash/operational logs | reliability | technical logs | org staff | host/observability | as above | 30 days | legitimate interest |

**Sensitivity flags:**

| Data type | Collected? | Notes |
|-----------|-----------|-------|
| Basic PII (name, email) | **Yes** | org staff |
| Special-category / sensitive (health, livelihood, etc.) | **Yes (likely)** | beneficiary field data can be sensitive → §3 |
| Children's data | **Possibly** | youth-focused programs → §3; org obtains guardian consent |
| Precise location | No (V1) | aggregate area only |
| Photos / camera / microphone | **Yes** | optional field photos → storage |
| Device / advertising IDs | No | — |
| Analytics / telemetry | Yes | no PII in properties |
| Crash logs | Yes | — |
| Payment / card data | No (V1) | no in-app payments |

**Self-check:**

| Item | Done? | Evidence link | Counsel needed? |
|------|-------|---------------|-----------------|
| Every processing activity has a retention period | Partial — per-org policy to be configured | SDD §7 | No |
| Every sub-processor named with a DPA in place | Named; DPAs **pending** (Supabase, Foundry, SMS gateway) | this table | **Yes** |
| Inventory is dated + living | Yes (2026-06-25) | this doc | No |

---

## 2. Multi-Jurisdiction Obligations Matrix

*Only the in-scope region (Philippines DPA) is filled.*

| Dimension | Philippines DPA 2012 (RA 10173) |
|-----------|---------------------------------|
| **Consent / legal basis** | Consent or other lawful criteria; **sensitive personal information needs explicit consent**. For beneficiary field data, the *organization* is typically the personal-information controller and obtains subject consent; Ciel is a processor/sub-processor — roles to be confirmed by counsel. |
| **Data subject rights** | Access, correct, erase/block, object, data portability, claim damages — Ciel must provide org-mediated request paths. |
| **Breach notification** | Notify **NPC and affected subjects within 72 hours** of knowledge when there is a real risk of serious harm → see OPS incident runbook. |
| **DPO / PIA / PMP** | **Mandatory DPO**, a **Privacy Impact Assessment**, and a Privacy Management Program for orgs processing personal data. |
| **Cross-border transfer** | Controller remains accountable; ensure comparable protection — prefer a PH/Asia data region for DB + Foundry. |
| **Our status / action** | **DPO: TBD (designate before pilot).** PIA: **to be completed** (counsel). Sub-processor DPAs: pending. |

**Watch list:** NPC circulars on AI/automated processing; evolving cross-border rules; any sector rules for health/child data. {{monitor}}

**Self-check:**

| Item | Done? | Evidence link | Counsel needed? |
|------|-------|---------------|-----------------|
| Consent model implemented (esp. sensitive data) | Designed (org-mediated); not yet built | PRD US-05, SDD §5 | **Yes** |
| Working data-subject-request path (access/delete) | Planned (per-org RLS + delete) | SDD §3 | Yes |
| Breach runbook with 72h NPC timeline | **Yes** | [ops-ciel.md](ops-ciel.md) | No |
| DPO designated | **No — action required** | — | **Yes** |

---

## 3. Escalation Flags — Counsel Required

| Flag | Present? | Why it escalates |
|------|----------|------------------|
| Children's data | **Possibly** | youth programs → guardian consent + heightened protection |
| Health / sensitive data | **Yes** | beneficiary livelihood/health data = sensitive personal information |
| Payments / card data | No | none in V1 |
| Biometric data | No | — |
| Large-scale / systematic monitoring or profiling | **Yes** | M&E tracks cohorts over time → PIA/DPIA territory |
| Automated decisions with legal/significant effect | **Mitigated** | scale/adapt/stop are **HITL recommendations**, never solely-automated actions (SDD §8) — but document this to counsel |
| Sale / share / behavioral advertising | No | never — not a data broker |
| Operating with no local entity in a market | **Confirm** | if no PH entity, confirm controller/processor + DPO obligations |

**PIA/DPIA required?** **Yes** — complete a Privacy Impact Assessment before processing real beneficiary data (out of scope for this register — counsel + NPC guidance).

---

## 4. Terms of Use / EULA Readiness

*Presence-check only; counsel drafts.*

| Clause | Present? | Counsel needed? |
|--------|----------|-----------------|
| License grant + scope | No (TBD) | — |
| Acceptable use / prohibited conduct | No (TBD) | — |
| Limitation of liability + warranty disclaimer | No (TBD) | **Yes** |
| Governing law + jurisdiction (Philippines) | No (TBD) | **Yes** |
| Dispute resolution | No (TBD) | **Yes** |
| Termination + suspension | No (TBD) | — |
| UGC license (field content) + takedown | No (TBD) | Yes |
| Modification / notice mechanism | No (TBD) | — |
| Data-processing addendum (controller↔processor with orgs) | **No — important** | **Yes** |
| Age eligibility | No (TBD) | Yes |
| Privacy Policy incorporated by reference | No (TBD) | Yes |

---

## 5. IP Infringement & Protection Readiness

| Item | Status | Counsel needed? |
|------|--------|-----------------|
| "Ciel" trademark knockout search (PH IPOPHL, relevant class) | **Not done** | **Yes** — common word ("sky"); clear before heavy brand spend |
| Open-source license compliance — SBOM maintained | Not yet (set up at build) | — |
| Copyleft scan (GPL/AGPL/LGPL) | Not yet | Yes if any copyleft enters distribution |
| Third-party assets licensed (fonts: Fraunces, Public Sans, JetBrains Mono — all OFL/libre) | Fonts are libre (OFL/Apache) | No |
| AI training-data provenance + output ownership/indemnity (Foundry/OpenAI enterprise terms) | Review terms | **Yes** |
| DMCA/takedown process | Not yet | — |
| Written IP assignment from each contributor | Not yet | **Yes** |

---

## 6. App Store / Platform Compliance

Not applicable in V1 — Ciel ships as a **web app + PWA**, not a native app-store binary. Revisit if a native wrapper is published (Apple Privacy label + Google Play Data Safety + account-deletion declaration would then apply).

---

## Self-Check
- [x] §0 declares every market; geo-blocking reality stated (PH-only pilot)
- [x] §1 has one row per processing activity, each with a retention note
- [x] §2 filled for the in-scope region (PH DPA) only
- [x] Every §3 "Yes" has a counsel action; **banner set at top**
- [x] §4 ToU clauses presence-checked (drafting left to counsel)
- [ ] §5 SBOM/copyleft scan — to set up during build
- [x] §6 addressed (web/PWA — store rules N/A in V1)
- [x] This document maps obligations and escalates — it does not give legal advice
