# Operations & Observability Runbook (OPS)

**Project:** Ciel — AI-native Impact Operating System for the social sector
**Date:** 2026-06-25
**Version:** 1.0
**Owner:** Ciel Team — Create & Conquer 2026
**Status:** Locked
**Last reconciled:** 2026-06-25
**SDD:** [sdd-ciel.md](sdd-ciel.md)

---

## 1. SLOs & SLIs

Targets pulled from [SDD §7](sdd-ciel.md); this is where they become measured commitments.

| SLI | SLO (target) | Measured by | Breach action |
|-----|--------------|-------------|---------------|
| Availability (app + AI service) | 99.5% / month | uptime monitor (Better Uptime/Checkly) | page on 2 consecutive failed checks |
| Non-AI API p95 latency | < 300ms | Vercel/APM metrics | investigate; check DB indexes |
| ToC stream first token | < 1.5s | AI-service trace (Langfuse) | check Foundry latency/region |
| Error rate | < 1% | logs/APM | roll back per PRD §9 if > 2% for 5 min |
| **AI groundedness** | ≥ baseline (no uncited factual claims) | eval sampling (QAD §7) | disable AI feature flag; investigate |
| AI cost per successful task | < 2× baseline | Langfuse | review prompts/model routing |
| **Offline sync success** | 100% (zero data loss) | client→server reconcile metric | investigate queue/idempotency |
| **SMS round-trip** | < 30s, ack delivered | gateway delivery webhook | check gateway + parser |

---

## 2. Observability — Logs, Metrics, Traces

| Pillar | Tool | What's captured | Retention |
|--------|------|-----------------|-----------|
| Logs | platform logs (Vercel + Azure App Service) structured JSON | request_id on every line; errors; auth events | 30 days |
| Metrics | APM + PostHog | SLIs above + PRD §5.5 business events | 90 days (events), 30 (system) |
| Traces (AI) | **Langfuse** (project "Ciel") | every Foundry call: prompt shape, tokens, cost, latency, eval score | 30–90 days |

**Dashboards:** (1) Health (SLIs), (2) AI cost + groundedness, (3) Impact funnel (PRD §5.5: `toc_generated` → `toc_locked` → `grant_drafted` → `mande_signal_fired`).
**Correlation ID:** `request_id` propagated client → Route Handler → AI service → logs/traces, so one user action (e.g., a ToC generation) is traceable end to end.
**No-PII-in-logs rule:** never log raw beneficiary data, prompts with PII, or secrets; hash user/phone IDs. Reconcile with [CLR §1](clr-ciel.md). **This is a privacy control, not just hygiene** (RA 10173).

---

## 3. Alerting & On-Call

| Alert | Condition | Severity | Notified |
|-------|-----------|----------|----------|
| Service down | 2 consecutive failed uptime checks | P0 | team phone/Slack |
| Error spike | error rate > 2% for 5 min | P1 | team channel |
| AI safety regression | any QAD §7 safety eval fails in CI/canary | P0 | block deploy + notify |
| Groundedness drop | sampled groundedness < threshold | P1 | review + consider flag off |
| Cost anomaly | AI cost/task > 2× baseline for 1h | P2 | review |
| **Privacy event** | suspected unauthorized access / data exposure | P0 | DPO + counsel (CLR breach path) |
| Offline-sync failures | sync success < 99% over 1h | P1 | investigate |

**On-call model:** solo/best-effort during hackathon; lightweight rotation across the team for pilot. Alerts to a shared channel + phone.
**Alert hygiene:** every alert must be actionable; noisy alerts get tuned or deleted (alert fatigue kills response).

---

## 4. Incident Response

**Severity ladder:** reuse the QAD P0–P3 scale.

**When an incident fires:**
1. **Acknowledge** — claim it.
2. **Assess** — severity, blast radius, worsening?
3. **Mitigate first, diagnose later** — disable the relevant feature flag (`ENABLE_TOC_CRITIQUE`, `ENABLE_SMS_INGEST`, `ENABLE_SIGNALS`) or roll back per [PRD §9](prd-ciel.md). Field data capture must keep working even if AI is down.
4. **Communicate** — status note to affected orgs; for any personal-data breach, **the DPO triggers NPC + affected-subject notification within 72 hours** (RA 10173; [CLR §2](clr-ciel.md)).
5. **Resolve & verify** — confirm SLIs normal.
6. **Postmortem** — any P0/P1 → `docs/pm-ciel-NNN.md` within 48h; fold action items back into QAD/OPS/BUILD.

**Rollback trigger & mechanism:** single source of truth = [PRD §9](prd-ciel.md) (redeploy previous tag; migrations backward-compatible; flags disable a module without a deploy).
**Kill switches / feature flags:** `ENABLE_TOC_CRITIQUE`, `ENABLE_SMS_INGEST`, `ENABLE_SIGNALS`, plus a global `ENABLE_AI` to fall back to templates + cached evidence.

---

## 5. Routine Operations

- **Secret rotation:** Foundry + Supabase service keys + SMS gateway secret rotated quarterly; stored in platform vault, never in repo.
- **Dependency / security updates:** Dependabot weekly; security patches within 7 days; re-verify BUILD §3 pinned versions when bumping Next.js/Foundry SDK.
- **Backup restore drill:** quarterly per [SDD §6](sdd-ciel.md) (RTO 4h / RPO 24h) — run once before the first real-data pilot (a backup never restored is not a backup).
- **Cost review:** monthly infra + AI spend vs budget (SDD §8 token budgets).
- **Cert / domain expiry:** auto-renew; calendar backstop.
- **AI eval baseline refresh:** re-run the QAD §7 suite and update the baseline whenever the model or system prompt changes (model-upgrade protocol).

---

## Self-Check
- [x] Every SLO in §1 has a real measurement source
- [x] Logs carry a correlation ID and contain no PII/secrets (RA 10173)
- [x] Every alert in §3 is actionable and routes to a real person (incl. DPO for privacy)
- [x] §4 names the rollback mechanism + kill switches and the 72h breach path
- [ ] A backup has actually been restored at least once — scheduled before first real-data pilot
- [x] P0/P1 Postmortem SLA (48h) defined; template available in `FMD/templates/POSTMORTEM_Template.md`
