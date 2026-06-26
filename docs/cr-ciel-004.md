# Change Record — ciel-cr-004

**Date:** 2026-06-26
**Status:** Applied
**Author:** Ciel Team
**Trigger doc:** [prd-ciel.md](prd-ciel.md) PRD-F2 · [sdd-ciel.md](sdd-ciel.md) §3 / §4

---

## 1. Summary

Implement **PRD-F2 — Automated Grant Writing & Resource Alignment** (Phase 1, the US-02 happy path):

1. **Data:** a `funders` catalog (seeded with PH-relevant funders) + extended `grant_proposals` (`title`, `status`, `updated_at`, real `funder_id` FK), with org-scoped RLS mirroring projects and an `updated_at` trigger.
2. **AI service:** a stateless `/grants/generate` SSE endpoint backed by `grant_nodes.draft_sections` — drafts a 9-section, funder-matched, citation-grounded proposal from the **locked** ToC, with a deterministic template fallback when Foundry creds are absent (mirrors the ToC pipeline).
3. **Web app:** a **Grant Workspace** (`/projects/[id]/grants`) gated on a locked ToC, with live streaming generation, and an editor (`/projects/[id]/grants/[grantId]`) for inline editing, per-section regenerate, funder-KPI alignment, status flow, and Markdown export.

## 2. Motivation

- Closes the second Must-Have module. F2 was previously schema-only; the dashboard labelled it "Soon."
- Realizes the vision thread: a proposal is **born from a locked ToC** (ground before scale), **donor-matched**, **citation-grounded**, and **human-owns-the-pen** — AI never silently overwrites human edits (sections carry `edited_by_human`).

## 3. Scope of change

| Doc / artifact | Section | Change |
|-----|---------|--------|
| `supabase/migrations/20260625182449_grant_proposals_f2.sql` | — | `funders` table + seed; `grant_proposals` columns + FK + RLS; `touch_grant_proposal_updated_at` trigger |
| [sdd-ciel.md](sdd-ciel.md) | §3 schema | New `funders` table; `grant_proposals` gains `title`/`status`/`updated_at` + funder FK |
| [sdd-ciel.md](sdd-ciel.md) | §4 endpoints | Real grant endpoints: `/api/grants` (create), `/api/grants/:id` (PATCH), `/api/grants/generate` (SSE) → AI `/grants/generate` |
| [index.md](index.md) | §2 change log | This CR row |
| `ai_service/` | models/graph/router | `models/grant.py`, `graph/grant_nodes.py`, `routers/grants.py`, `foundry_client.generate_grant`, router wired in `main.py` |
| `client/` | grants UI | Grant Workspace + editor pages, `components/grants/*`, API routes |

## 4. Non-goals / unchanged

- ToC pipeline, RLS model, and existing tables — unchanged (additive only).
- Roles: drafting requires `program`/`admin` (RLS); viewers can read.
- No new web/AI dependencies; reuses Foundry client + evidence patterns.

## 5. Risks / follow-ups

- **AI path unverified against live Foundry.** The deterministic template path is verified (9 sections + KPI alignment); the Foundry `generate_grant` path needs a live-key smoke test, like the ToC pipeline.
- **Funder catalog is a seeded starter set** (5 PH funders) — not an exhaustive or live-matched donor database. A real matching service is future work.
- **Audit-log wiring deferred to Phase 2** — grant generate/edit/finalize should write `audit_log` (also closes part of the F4 gap, US-05).
- **Export is Markdown only** (clipboard + download); PDF/DOCX and §5.5 instrumentation (`grant_drafted`) are follow-ups.
- **Single-section regenerate** reuses `/grants/generate` with `only_section`; fine for Phase 1.
- Pre-existing: `test_h03_ai_readiness` fails to collect locally because `openai` isn't installed in this env (unrelated to F2).
