import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { RegisterFieldServiceWorker } from "@/components/mande/register-field-sw";
import { getCurrentUser, getUserOrganizations } from "@/lib/supabase/server";
import {
  membershipsToShellOrgs,
  resolveActiveOrgId,
  type WorkspaceMembership,
} from "@/lib/workspace-context";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const memberships = (await getUserOrganizations()) as unknown as WorkspaceMembership[];
  if (memberships.length === 0) redirect("/onboarding");

  const orgs = membershipsToShellOrgs(memberships);
  const activeOrgId = resolveActiveOrgId(memberships);

  return (
    <Suspense fallback={null}>
      <DashboardShell
        user={{ email: user.email ?? "" }}
        orgs={orgs}
        activeOrgId={activeOrgId}
      >
        <RegisterFieldServiceWorker />
        {children}
      </DashboardShell>
    </Suspense>
  );
}
