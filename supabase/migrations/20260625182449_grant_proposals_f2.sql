-- PRD-F2: Grant Writing & Resource Alignment
-- Adds a funder catalog and extends grant_proposals for donor-matched, editable,
-- citation-grounded proposals. RLS mirrors the org-scoped project pattern.
-- Date: 2026-06-26 · CR-004

-- 1. Funder catalog ---------------------------------------------------------
create table if not exists funders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('foundation','csr','government','multilateral')),
  region text,
  focus_areas text[] not null default '{}',
  kpis text[] not null default '{}',
  priorities jsonb not null default '{}'::jsonb,
  typical_grant_php_min numeric,
  typical_grant_php_max numeric,
  created_at timestamptz not null default now()
);

insert into funders (name, type, region, focus_areas, kpis, priorities, typical_grant_php_min, typical_grant_php_max) values
  ('Peace and Equity Foundation', 'foundation', 'Philippines', array['livelihood','social enterprise','poverty reduction'], array['households_lifted','enterprises_sustained','jobs_created'], '{"voice":"community-led, sustainability-first","requires":["theory of change","sustainability plan","local counterpart"]}'::jsonb, 500000, 5000000),
  ('Ayala Foundation', 'csr', 'Philippines', array['education','youth','digital inclusion'], array['learners_reached','completion_rate','employment_rate'], '{"voice":"scalable, measurable, partnership-driven","requires":["clear outcomes","M&E plan","co-funding"]}'::jsonb, 300000, 3000000),
  ('DSWD Grants-in-Aid (RA 12009)', 'government', 'Philippines', array['social welfare','community development','disaster resilience'], array['beneficiaries_served','fund_utilization_rate','audit_compliance'], '{"voice":"compliance-first, public accountability","requires":["NGPA compliance","procurement plan","audit trail","LGU endorsement"]}'::jsonb, 1000000, 10000000),
  ('Globe Future Makers', 'csr', 'Philippines', array['climate','technology for good','youth innovation'], array['beneficiaries_reached','co2_avoided','solutions_deployed'], '{"voice":"innovation, impact-at-scale","requires":["tech component","impact metrics","scaling plan"]}'::jsonb, 250000, 2000000),
  ('ADB Japan Fund for Poverty Reduction', 'multilateral', 'Asia-Pacific', array['poverty reduction','inclusive growth','gender'], array['poverty_incidence_change','women_beneficiaries','cost_effectiveness'], '{"voice":"results framework, rigorous M&E","requires":["logframe","gender action plan","results matrix"]}'::jsonb, 2000000, 50000000);

alter table funders enable row level security;
create policy "Authenticated users can read funders" on funders for select to authenticated using (true);

-- 2. Extend grant_proposals -------------------------------------------------
alter table grant_proposals
  add column if not exists title text,
  add column if not exists status text not null default 'draft' check (status in ('draft','in_review','final')),
  add column if not exists updated_at timestamptz not null default now();

alter table grant_proposals
  add constraint fk_grant_funder foreign key (funder_id) references funders(id) on delete set null;

-- 3. RLS on grant_proposals (org-scoped via parent project) -----------------
alter table grant_proposals enable row level security;

create policy "Users can view org grant proposals" on grant_proposals for select
  using (project_id in (select id from projects where org_id in (select public.user_orgs())));

create policy "Program users can create grant proposals" on grant_proposals for insert
  with check (project_id in (select p.id from projects p where public.has_org_role(p.org_id,'program') or public.has_org_role(p.org_id,'admin')));

create policy "Program users can update grant proposals" on grant_proposals for update
  using (project_id in (select p.id from projects p where public.has_org_role(p.org_id,'program') or public.has_org_role(p.org_id,'admin')));

-- 4. auto-update updated_at -------------------------------------------------
create or replace function public.touch_grant_proposal_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_grant_proposals_updated_at
  before update on grant_proposals
  for each row execute function public.touch_grant_proposal_updated_at();
