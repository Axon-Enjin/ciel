-- PRD-F2: persist funder KPI alignment on grant proposals (US-02 / H-03)
alter table grant_proposals
  add column if not exists alignment jsonb not null default '[]'::jsonb;
