# Change Record — ciel-cr-002

**Date:** 2026-06-26
**Status:** Applied
**Author:** Ciel Team
**Trigger doc:** [sdd-ciel.md](sdd-ciel.md) §8

---

## 1. Summary

Switch Ciel's runtime model to **GPT-only on Microsoft Foundry**. All AI tasks — interactive ToC generation, the adversarial "intelligent-failure" critique, grant drafting, M&E rationale, and cheap classify/parse — run on **GPT (frontier / mini) via Microsoft Foundry**. **Claude is dropped from the product runtime.**

> Supersedes the earlier draft of this CR (which proposed a Claude-primary, then a GPT-primary/Claude-critique multi-model split). Final decision is **GPT-only**.

## 2. Motivation

- **Availability constraint (decisive):** the team's Microsoft Foundry tenant exposes **only GPT models** — Claude deployments are not available there. Building a Claude dependency into the runtime would not deploy.
- Single-vendor runtime simplifies the SDK path (one Foundry/OpenAI-compatible client), deployment config, token-budget tuning, and the eval matrix.
- The adversarial critique is preserved as a **separate GPT pass** with a distinct privileged system prompt and lower temperature — the "intelligent-failure" gate (SDD §8) stays; it is now single-model self-critique rather than cross-model.
- The BCG/Anthropic market tailwind (evidence **C2**) remains a **verified market-context fact** that validates the *sector*; it never bound Ciel's runtime model choice and is unaffected.

## 3. Scope of change

| Doc | Section | Change |
|-----|---------|--------|
| [index.md](index.md) | §5 Notes (stack) | stack runs **GPT-only** on Foundry |
| [sdd-ciel.md](sdd-ciel.md) | §2 diagram + tech-stack table | Foundry node/role → **GPT-only** |
| [sdd-ciel.md](sdd-ciel.md) | §4 External services | "GPT/Claude" → **GPT** |
| [sdd-ciel.md](sdd-ciel.md) | §8 Model selection table | every task → **GPT (frontier/mini)**; critique = separate GPT pass |
| [prd-ciel.md](prd-ciel.md) | §5 AI component | considered/selected model + dependency → **GPT via Foundry** |
| [rfc-ciel-toc-generator.md](rfc-ciel-toc-generator.md) | flow diagram + §5 Models | draft + critique → **GPT (frontier)** |
| [rfc-ciel-field-mande.md](rfc-ciel-field-mande.md) | §5 Model | narration + parse → **GPT (frontier / mini)** |
| [clr-ciel.md](clr-ciel.md) | §1 data-flow + IP-checklist | sub-processor "(Claude/GPT)" → **(GPT)**; terms ref Foundry/OpenAI |
| [build-ciel.md](build-ciel.md) | §3 register + golden-path heading | **GPT-only**; AI-node heading |
| [evidence-ciel.md](evidence-ciel.md) | stack note | Ciel runtime → **GPT-only** (Foundry still *can* run both; C2 unchanged) |
| [gtm-ciel.md](gtm-ciel.md) | §3 proof points | keep BCG/Anthropic *market* fact; drop "Claude in Ciel's runtime" implication |
| AGENTS.md / .claude/agents/ai-pipeline-engineer.md | stack line / intro | **GPT-only** runtime |

## 4. Non-goals / unchanged

- Microsoft Foundry as the control plane (Agent Service on Responses API + Foundry IQ) — unchanged.
- The grounded-or-flagged-unverified rule, HITL gates, and SDD §8.1 safety boundary — unchanged.
- Token budgets and the streaming/critique pipeline shape — unchanged.
- The BCG/Anthropic evidence row (**C2**), and the BRD/GTM tailwind framing built on it — unchanged; these are market facts, not runtime claims.
- `.claude/agents/` subagents (SAD) — these run on **Claude Code** as the *build-time* dev platform and are independent of the product's *runtime* model; unchanged.

## 5. Risks / follow-ups

- **No cross-model critique.** Self-critique with the same family can miss correlated blind spots. Mitigate via a strongly adversarial critique prompt + lower temperature, and lean on the QAD grounding/safety evals as the real gate.
- **Exact GPT deployment name is perishable** — docs reference the tier ("GPT frontier" / "GPT mini"), not a pinned version. Pin the concrete Foundry deployment at build time per BUILD §3 "verify live".
- **Code update required.** `ai_service/services/foundry_client.py`, `ai_service/config.py`, and `ai_service/.env.example` still use the Anthropic client and `claude-*` deployments. Implementing this CR means switching to Foundry's GPT deployment (OpenAI-compatible / Responses API client) for all calls. Track as a build task.
- Re-run the QAD AI eval suite (grounding + safety gates) on GPT before merge; thresholds must hold.
