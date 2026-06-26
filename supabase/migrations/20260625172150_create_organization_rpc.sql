-- Atomic onboarding: create an organization + the creator's admin membership
-- in a single SECURITY DEFINER call. Runs with a guaranteed auth.uid() from the
-- caller's JWT and avoids partial-failure (orphan org) and the RLS chicken-and-egg
-- between organizations INSERT and the first memberships INSERT.
-- Date: 2026-06-26

create or replace function public.create_organization(
  p_name text,
  p_org_type text,
  p_mission text default null,
  p_region text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.organizations (name, org_type, mission, region)
  values (p_name, p_org_type, p_mission, p_region)
  returning id into v_org_id;

  insert into public.memberships (org_id, user_id, role)
  values (v_org_id, v_uid, 'admin');

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, text, text, text) from public;
revoke execute on function public.create_organization(text, text, text, text) from anon;
grant execute on function public.create_organization(text, text, text, text) to authenticated;
