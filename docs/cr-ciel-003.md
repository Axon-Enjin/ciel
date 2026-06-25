# Change Record — ciel-cr-003

**Date:** 2026-06-26
**Status:** Applied
**Author:** Ciel Team
**Trigger doc:** [sdd-ciel.md](sdd-ciel.md) §3 / §5

---

## 1. Summary

Add the **organization-onboarding bootstrap** to the data layer and reconcile the **migration history** with the hosted database:

1. A `SECURITY DEFINER` RPC **`public.create_organization(name, org_type, mission, region)`** that creates an organization **and** the creator's `admin` membership **atomically**, returning the new org id.
2. A scoped RLS policy **`"Creators can insert initial admin membership"`** on `memberships` that lets a first member self-insert exactly one `admin` row for an org that has no members yet.
3. **Migration-history reconciliation:** the local `supabase/migrations/` filenames were realigned to the hosted database's tracked migration versions, and the previously untracked `onboarding_membership` policy was registered into history. Local and remote now agree (5 migrations).

## 2. Motivation

- **RLS chicken-and-egg.** The original `memberships` INSERT policy required `auth.has_org_role(org_id,'admin')`. A brand-new user creating their first organization has no membership yet, so they could never insert the first `admin` row — onboarding could not complete.
- **Unauthenticated browser insert.** Onboarding originally wrote `organizations` directly from the browser client, which intermittently reached Postgres without a valid session (`auth.uid()` NULL), failing the `organizations` INSERT policy (`new row violates row-level security policy`). Moving creation to a server route + `SECURITY DEFINER` RPC guarantees an authenticated `auth.uid()` and avoids partial failure (an org with no membership).
- **Reproducible deploys.** The hosted DB's tracked migration versions had drifted from the local filenames, and the live `onboarding_membership` policy was applied out-of-band (untracked). Reconciling restores a deployable, source-of-truth history.

## 3. Scope of change

| Doc / artifact | Section | Change |
|-----|---------|--------|
| [sdd-ciel.md](sdd-ciel.md) | §3 Data architecture | New **Onboarding bootstrap** note: `create_organization` RPC + the first-member membership policy |
| [sdd-ciel.md](sdd-ciel.md) | §4 Internal endpoints | Add `POST /api/onboarding` (create workspace via the RPC) |
| [sdd-ciel.md](sdd-ciel.md) | §5 Authorization | Note the scoped bootstrap policy + `SECURITY DEFINER` RPC as the first-member path |
| [index.md](index.md) | §1 suite table | Bump SDD Last Updated / Last Reconciled to 2026-06-26 |
| [index.md](index.md) | §2 change log | This CR row |
| `supabase/migrations/` | filenames | Realigned to remote versions: `…151608_initial_schema`, `…151637_rls_policies`, `…151639_pgvector_search`, `…151700_onboarding_membership`, `…172150_create_organization_rpc` |
| `supabase_migrations.schema_migrations` (hosted) | — | Registered `onboarding_membership` (version `20260625151700`) without re-running it (policy already live) |

## 4. Non-goals / unchanged

- The multi-tenant RLS model (SDD §5) and all existing per-table policies — unchanged; this only adds the first-member bootstrap path.
- Schema tables and relationships (SDD §3) — unchanged; no columns added or altered.
- The `organizations` INSERT policy (`auth.uid() IS NOT NULL`) — unchanged; the RPC satisfies it server-side.
- Roles (admin/program/field/viewer) and the audit model — unchanged.

## 5. Risks / follow-ups

- **`SECURITY DEFINER` exposure.** `create_organization` is callable via PostgREST. `EXECUTE` is granted to `authenticated` only and **revoked from `anon`** (verified against `get_advisors`); the function also raises `not authenticated` when `auth.uid()` is NULL. Keep this grant posture on any future redefinition.
- **Duplicate onboarding routes.** The repo currently has both `client/src/app/api/onboarding/route.ts` and `…/api/onboarding/workspace/route.ts`; the onboarding form posts to `/api/onboarding`. Consolidate to one canonical route and delete the other.
- **CLI repair done via DB.** History was reconciled by writing `schema_migrations` directly (equivalent to `supabase migration repair`) because the CLI was not interactively available. Re-run `supabase migration list --linked` when the CLI is set up to confirm zero drift.
- **Pre-existing advisor warnings** unrelated to this CR remain open (leaked-password protection disabled; `vector` extension in `public`; mutable `search_path` on `match_evidence_sources`).
