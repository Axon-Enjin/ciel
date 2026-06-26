import type { ShellOrg } from "@/components/dashboard/dashboard-shell";

export type WorkspaceMembership = {
  org_id: string;
  role: string;
  organizations:
    | { id: string; name: string; org_type: string; mission: string | null }
    | { id: string; name: string; org_type: string; mission: string | null }[];
};

function orgOf(m: WorkspaceMembership) {
  return Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
}

export function membershipsToShellOrgs(
  memberships: WorkspaceMembership[],
): ShellOrg[] {
  return memberships.map((m) => {
    const o = orgOf(m);
    return { id: m.org_id, name: o.name, role: m.role, type: o.org_type };
  });
}

/** Pick active org: valid ?org= → project org → first membership. */
export function resolveActiveOrgId(
  memberships: WorkspaceMembership[],
  orgParam?: string | null,
  projectOrgId?: string | null,
): string {
  const ids = new Set(memberships.map((m) => m.org_id));
  if (orgParam && ids.has(orgParam)) return orgParam;
  if (projectOrgId && ids.has(projectOrgId)) return projectOrgId;
  return memberships[0]?.org_id ?? "";
}

export function orgQuery(orgId: string): string {
  return orgId ? `?org=${encodeURIComponent(orgId)}` : "";
}

export function withOrgQuery(path: string, orgId: string): string {
  if (!orgId) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}org=${encodeURIComponent(orgId)}`;
}
