# Documentation Index — Ciel

**Project slug:** `ciel`
**Maintained by:** Ciel Team — Create & Conquer 2026
**Last updated:** 2026-06-26

> **About Ciel:** An AI-native *Impact Operating System* for the social sector (NGOs, LGUs, community coalitions) — built for **Theme #2** of the Create & Conquer 2026 Hackathon. Ciel turns an identified social need into a rigorous Theory of Change, funded grant proposals, and a live predictive M&E loop — closing the gap from *need identified* to *solution scaled*. Name: **Ciel** (French, "sky"; pronounced *ci-yel*).

> **Read first:** [`evidence-ciel.md`](evidence-ciel.md) is the fact-check backbone — every load-bearing claim in the suite resolves to a row there. Source material: [`Idea.MD.md`](../Idea.MD.md), [`docs/theme.md`](theme.md), [`docs/hackathon-guide.md`](hackathon-guide.md).

---

## 1. Document Suite

| Document | File | Version | Status | Last Updated | Last Reconciled |
|----------|------|---------|--------|--------------|-----------------|
| Evidence Ledger (fact-check) | [evidence-ciel.md](evidence-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| BRD — Business Requirements | [brd-ciel.md](brd-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| PRD — Product Requirements | [prd-ciel.md](prd-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| DSD — Design System | [dsd-ciel.md](dsd-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| SDD — System Design | [sdd-ciel.md](sdd-ciel.md) | 1.0 | Locked | 2026-06-26 | 2026-06-26 |
| QAD — QA & Test Plan | [qad-ciel.md](qad-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| SAD — Subagents | [sad-ciel.md](sad-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| BUILD — Build Guide | [build-ciel.md](build-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| CLR — Compliance & Legal | [clr-ciel.md](clr-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| GTM — Go-To-Market | [gtm-ciel.md](gtm-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |
| OPS — Ops & Observability | [ops-ciel.md](ops-ciel.md) | 1.0 | Locked | 2026-06-25 | 2026-06-25 |

### RFCs (one per major feature)

| RFC ID | File | Feature | Status | Last Updated |
|--------|------|---------|--------|--------------|
| ciel-rfc-001 | [rfc-ciel-toc-generator.md](rfc-ciel-toc-generator.md) | PRD-F1 — AI Theory-of-Change Generator | Locked | 2026-06-25 |
| ciel-rfc-002 | [rfc-ciel-field-mande.md](rfc-ciel-field-mande.md) | PRD-F3 — Predictive M&E + low-connectivity field ingestion | Locked | 2026-06-25 |

---

## 2. Change Log

Every material change to a Locked document is recorded as a Change Record. Newest first.

| CR ID | Date | Summary | Trigger doc | Docs touched | File |
|-------|------|---------|-------------|--------------|------|
| ciel-cr-003 | 2026-06-26 | Onboarding bootstrap: `create_organization` `SECURITY DEFINER` RPC + first-member membership policy (atomic org+admin create, fixes RLS chicken-and-egg); reconciled local migration history with the hosted DB | sdd-ciel.md | index.md, sdd-ciel.md, supabase/migrations | [cr-ciel-003.md](cr-ciel-003.md) |
| ciel-cr-002 | 2026-06-26 | Runtime model → **GPT-only** on Microsoft Foundry (tenant exposes only GPT; Claude dropped from runtime); critique kept as a separate GPT pass | sdd-ciel.md | index.md, sdd-ciel.md, prd-ciel.md, rfc-ciel-toc-generator.md, rfc-ciel-field-mande.md, clr-ciel.md, build-ciel.md, evidence-ciel.md, gtm-ciel.md | [cr-ciel-002.md](cr-ciel-002.md) |
| ciel-cr-001 | 2026-06-25 | AI service hosting: Azure Container Apps → Azure App Service (non-containerized); frontend stays on Vercel | sdd-ciel.md | sdd-ciel.md, ops-ciel.md | [cr-ciel-001.md](cr-ciel-001.md) |

---

## 3. Incident Log (Postmortems)

| PM ID | Incident date | Severity | Summary | Action items closed? | File |
|-------|---------------|----------|---------|----------------------|------|
| — | — | — | No incidents (pre-production) | — | — |

---

## 4. Health Check

- [x] Every load-bearing claim in BRD/PRD/SDD/GTM/CLR resolves to a row in `evidence-ciel.md`.
- [x] Feature IDs (`PRD-F1`–`PRD-F6`) referenced by SDD / RFC / QAD / SAD / BUILD exist in the PRD.
- [x] Metric IDs (`BRD-M1`–`BRD-M6`) flow to the GTM and have a feeding event in PRD §5.5.
- [x] The SAD roster matches the materialized agent files in `.claude/agents/` (no orphans).
- [x] The BUILD guide's pinned versions are verified-dated (2026-06-25) against current official docs.
- [ ] Re-verify BUILD pinned versions + golden-path samples before any real build sprint (samples are perishable).
- [ ] `/impeccable audit` run against actual frontend code once the prototype exists (DSD §8 gate).

---

## 5. Notes

- **Scale:** authored at **Full** scale (all 11 FMD docs + INDEX) per team decision, to serve as a hackathon-grade, defensible documentation suite.
- **Jurisdiction:** Philippines-first. B2G content uses **RA 12009 (NGPA)**; data handling uses **RA 10173 (Data Privacy Act)**.
- **Stack:** Next.js 16 frontend (`client/`) + Python AI service (FastAPI + LangGraph) + **Microsoft Foundry** (formerly Azure AI Foundry) running **GPT-only** (GPT frontier for generation + the adversarial critique; GPT-mini for cheap classify/parse). See [cr-ciel-002.md](cr-ciel-002.md).
- **Brand assets:** see [`/brand`](../brand) — overview board, logo construction, UI application, and logo SVGs. Brand stance is authored in the DSD §0.
