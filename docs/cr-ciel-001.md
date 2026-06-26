# Change Record — ciel-cr-001

**Date:** 2026-06-25
**Status:** Applied
**Author:** Ciel Team
**Trigger doc:** [sdd-ciel.md](sdd-ciel.md) §2, §6

---

## 1. Summary

Change the Python AI service hosting target from **Azure Container Apps (containerized)** to **Azure App Service (non-containerized)**. The Next.js frontend remains on **Vercel**, unchanged.

## 2. Motivation

- Avoid the operational overhead of building, registering, and maintaining a container image for the AI service for the pilot.
- Azure App Service's Linux Python runtime (source/zip deploy via the Oryx build) is sufficient for the FastAPI + LangGraph service at pilot scale and ships faster.
- No Dockerfile exists in the repo yet; adopting App Service avoids introducing one.

## 3. Scope of change

| Doc | Section | Change |
|-----|---------|--------|
| [sdd-ciel.md](sdd-ciel.md) | §2 Tech stack table (Infrastructure row) | ACA → Azure App Service (non-containerized) |
| [sdd-ciel.md](sdd-ciel.md) | §6 Hosting + Environments | ACA → Azure App Service; `prod` env updated |
| [ops-ciel.md](ops-ciel.md) | §2 Observability (Logs row) | "Vercel + ACA" → "Vercel + Azure App Service" |

## 4. Non-goals / unchanged

- Frontend hosting (Vercel) — unchanged.
- Microsoft Foundry control plane, Supabase, Upstash Redis — unchanged.
- Co-location with Foundry (region/latency/residency posture) — preserved.
- CI/CD shape (GitHub Actions: lint → type-check → test → deploy) — unchanged; deploy step now targets App Service source/zip deploy instead of a container push.

## 5. Risks

- App Service cold-start / scaling characteristics differ from ACA; validate against §7 NFRs (AI stream first token < 1.5s, uptime 99.5% pilot) before the production pilot.
