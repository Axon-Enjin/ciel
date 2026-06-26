# Project Build Guide — Ciel

**Project:** Ciel — AI-native Impact Operating System for the social sector
**Date:** 2026-06-25
**Version:** 1.0
**Owner:** Ciel Team — Create & Conquer 2026
**Status:** Locked
**Last reconciled:** 2026-06-25
**PRD:** [prd-ciel.md](prd-ciel.md) · **SDD:** [sdd-ciel.md](sdd-ciel.md) · **SAD:** [sad-ciel.md](sad-ciel.md)

> This is the operating manual for whoever **builds** Ciel — human or agent. It is the canonical source; it materializes to the repo-root `AGENTS.md`. Edit here, re-materialize. (The existing [`client/AGENTS.md`](../client/AGENTS.md) stays as the frontend-scoped Next.js note; this guide is the system-wide guide.)

---

## 1. How to Build From These Docs

Read in this order before writing code:
1. **[index.md](index.md)** — what exists, each doc's status, what's stale. Every session starts here.
2. **[PRD](prd-ciel.md)** — what to build and why (PRD-F1..F6, user stories, flow).
3. **[SDD](sdd-ciel.md)** — architecture (schema §3, APIs §4, security §5, AI §8 + safety §8.1).
4. **RFCs** — [ToC generator](rfc-ciel-toc-generator.md), [field M&E](rfc-ciel-field-mande.md).
5. **[DSD](dsd-ciel.md)** — brand stance + tokens + components.
6. **This guide** — stack conventions, patterns, guardrails.

**Only build against `Locked` docs.** If reality diverges from a Locked doc, don't code around it — raise a Change Record (`docs/cr-ciel-NNN.md`).

### Traceability map — "to build X, read Y"

| To implement… | Read | Verify against |
|---|---|---|
| A feature `PRD-F#` | PRD §3/§4 → SDD components → its RFC | QAD scenarios tagged with the `US-##` |
| A schema change | SDD §3 → RFC §3 Data Model | SDD §3 migration strategy (backward-compatible) |
| An API endpoint | SDD §4 → RFC §3 contracts | QAD sad/abuse paths |
| An AI behavior | SDD §8 → RFC §5 | QAD §7 evals (incl. AI-04..08 safety) |
| A UI surface | DSD §4 + PRD §5 states | DSD §0 anti-slop + a11y |

---

## 2. Subagents

Specialist build agents are defined in [sad-ciel.md](sad-ciel.md) and materialized to `.claude/agents/`. Spawn per the SAD orchestration: `data-rag-engineer` → (`ai-pipeline-engineer` ∥ `frontend-builder`) → `eval-safety-runner` + `compliance-checker` gate the merge.

---

## 3. Stack Currency & Deprecations

> **Rule:** do not emit framework APIs from training memory. **Next.js 16 and the AI SDKs diverge from older conventions** — verify against the pinned-version docs below before writing. The deprecations register **overrides** what you "know."

### Pinned stack

| Layer | Technology | Pinned version | Verified (date) | Source |
|-------|------------|----------------|-----------------|--------|
| Language | TypeScript | ^5 | 2026-06-25 | typescriptlang.org |
| Framework (web) | Next.js (App Router) | 16.2.9 | 2026-06-25 | https://nextjs.org/docs/app/guides/upgrading/version-16 |
| UI runtime | React | 19.2.4 | 2026-06-25 | react.dev |
| Styling | Tailwind CSS | v4 (`@tailwindcss/postcss`) | 2026-06-25 | https://tailwindcss.com/blog/tailwindcss-v4 |
| Auth/DB/Storage | Supabase + `@supabase/ssr` | latest | 2026-06-25 | https://supabase.com/docs/guides/auth/server-side/nextjs |
| Vector | pgvector (in Postgres) | latest | 2026-06-25 | github.com/pgvector/pgvector |
| AI service | Python | 3.12 | 2026-06-25 | python.org |
| AI orchestration | FastAPI + LangGraph | latest | 2026-06-25 | langchain-ai.github.io/langgraph |
| Model/agent/RAG | **Microsoft Foundry** (formerly Azure AI Foundry) — Foundry Agent Service + Foundry IQ; **GPT-only** runtime (tenant exposes only GPT; cr-002) | current | 2026-06-26 | https://learn.microsoft.com/en-us/azure/foundry/agents/overview |

### Deprecations & convention changes — DO NOT use the stale form

| ❌ Stale / deprecated | ✅ Current convention | Since | Source |
|----------------------|----------------------|-------|--------|
| `middleware.ts` + `export function middleware()` | **`proxy.ts` + `export function proxy()`** — node runtime only (no edge); config `skipMiddlewareUrlNormalize`→`skipProxyUrlNormalize`. Codemod: `npx @next/codemod@latest rename-middleware-to-proxy` | Next.js 16 | https://nextjs.org/docs/messages/middleware-to-proxy |
| Synchronous `cookies()` / `headers()` / `params` / `searchParams` | **`await cookies()` / `await headers()`; `params`/`searchParams` are Promises — `await` them.** Use `npx next typegen` for typed params | Next.js 16 | https://nextjs.org/docs/app/guides/upgrading/version-16 |
| `next dev/build` on Webpack by default; `experimental.turbopack` | **Turbopack is default** for dev+build; config moved to top-level `nextConfig`. Custom webpack build fails unless `--webpack` | Next.js 16 | nextjs.org/blog/next-16 |
| `tailwind.config.js` with `content[]` | **CSS-first:** `@import "tailwindcss";` + `@theme { --color-… }`; content auto-detected; no JS config needed | Tailwind v4 | tailwindcss.com/blog/tailwindcss-v4 |
| `@supabase/auth-helpers-nextjs` | **`@supabase/ssr`** with `createServerClient` + cookie `getAll`/`setAll` (NOT `get`/`set`/`remove`) | 2025+ | supabase.com/docs/.../creating-a-client |
| "Azure AI Foundry" name; Assistants API | **"Microsoft Foundry"** (Jan 2026); **Foundry Agent Service on the Responses API** (Assistants API retired) | Jan 2026 | learn.microsoft.com/azure/foundry |

**Fast-moving deps requiring live verification before coding:** Next.js, React, `@supabase/ssr`, the Foundry/Anthropic SDKs, LangGraph. Verify API shape against current docs every time.
**Self-anneal:** when drift is caught, add a row here (and a CR if behavior changed).

---

## 4. Golden-Path Patterns

> Version-tagged + dated. Confirm against §3 before copying.

### Server data fetch (Supabase server client) · *verified 2026-06-25 against Next.js 16.2.9 + @supabase/ssr*

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies(); // Next.js 16: cookies() is async — must await
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* called from a Server Component render — safe to ignore; proxy.ts refreshes */ }
        },
      },
    }
  );
}
```
*Why this shape:* `getAll`/`setAll` is the only supported cookie API in `@supabase/ssr`; RLS (SDD §5) means every query is automatically org-scoped — never hand-roll ownership filters.

### Route handler with async params + Zod + ownership · *verified 2026-06-25 against Next.js 16.2.9*

```typescript
// app/api/projects/[id]/route.ts
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next.js 16: params is a Promise
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return Response.json({ error: "bad id" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select("*").eq("id", parsed.data).single();
  // RLS enforces org membership; cross-org access returns no row (→ 404), never another org's data.
  if (error || !data) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(data);
}
```
*Why this shape:* validate at the boundary (Zod), await `params`, lean on RLS instead of trusting client IDs (QAD AB-01).

### Tailwind v4 theme tokens (DSD → CSS) · *verified 2026-06-25 against Tailwind v4*

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-bg: #F6F8FC;       --color-surface: #FFFFFF;   --color-border: #E3E8F2;
  --color-primary: #2456C8;  --color-accent: #F2B450;    --color-text: #0B1533;
  --font-display: "Fraunces", serif;  --font-sans: "Public Sans", sans-serif;
}
```
*Why this shape:* DSD tokens live in CSS (Tailwind v4 CSS-first) — no `tailwind.config.js`. This is the DSD §2 palette; do not substitute slop defaults (no Inter, no indigo→violet).

### Grounded AI node (LangGraph → Foundry; GPT-only) · *verified 2026-06-25 against LangGraph + Foundry Agent Service*

```python
# ai_service/graph/toc_draft.py  (Python 3.12)
from pydantic import BaseModel

class TocClaim(BaseModel):
    text: str
    source_ids: list[str]      # empty list => render as "unverified — needs human input"

def draft_toc(state: dict) -> dict:
    chunks = state["retrieved"]            # from Foundry IQ retrieval node
    if not chunks:
        return {"toc": None, "note": "insufficient evidence — ask user for input"}
    # Foundry Agent Service (Responses API) call with the cached, privileged system prefix;
    # output is validated against the Pydantic schema before persistence.
    resp = state["foundry"].respond(system=state["sys_prefix"], context=chunks, schema=TocClaim)
    return {"toc": resp.structured, "tokens": resp.usage}  # never auto-acts; HITL lock downstream
```
*Why this shape:* grounded-or-labeled-unverified is a hard rule (SDD §8/§8.1); structured output is schema-validated; the model never fires a write/act tool autonomously.

---

## 5. Conventions & Guardrails

**Repo layout:** `client/` (Next.js app — routes in `app/`, shared in `lib/`, UI in `components/`), `ai_service/` (FastAPI + LangGraph), `supabase/` (migrations + RLS), `docs/` (this suite), `brand/` (SVG assets).

**Naming:** files kebab-case; React components PascalCase; DB tables snake_case plural; events snake_case `object_action` past tense (PRD §5.5).

**Always:**
- Validate external input at the boundary (Zod in TS, Pydantic in Python).
- Treat user/field/retrieved content as **untrusted data** to the model (SDD §8.1).
- Keep every AI claim grounded or explicitly flagged unverified.

**Never:**
- Use a deprecated API from §3 because it "looks right" from memory (await your request APIs; use `proxy.ts`).
- Commit secrets (Foundry keys, Supabase service key) — env only.
- Let the LLM decide a scale/adapt/stop signal or fire a destructive tool without HITL.
- Ship DSD §0 slop (indigo→violet gradients, Inter-only, glassmorphism, AI orbs).

**Tests:** every Must-Have feature ships with its QAD happy + sad + abuse paths; AI changes must pass the QAD §7 safety gate. Run `pnpm test && pnpm playwright test && python scripts/run_eval.py --suite core --gate` before claiming done.

**Definition of Done (one task):**
- [ ] Implements the referenced `PRD-F#` / `US-##` acceptance criteria
- [ ] Verified framework conventions against §3 (no stale APIs)
- [ ] Tests + AI safety gate pass
- [ ] No new secrets; input validated at boundaries
- [ ] Touched a Locked doc's assumptions? → logged a Change Record

---

## 6. Materialization

| Target | File | Notes |
|--------|------|-------|
| Canonical | `docs/build-ciel.md` | edit here |
| All agents | `AGENTS.md` (repo root) | full content; auto-read by Codex/Cursor/Gemini/Claude Code |
| Claude Code | `CLAUDE.md` (repo root) | pointer to `AGENTS.md` |
| Frontend-scoped | `client/AGENTS.md` | **unchanged** — keep the Next.js-16 warning note |

Re-materialize whenever this guide changes; root copies are build artifacts, not sources of truth.
