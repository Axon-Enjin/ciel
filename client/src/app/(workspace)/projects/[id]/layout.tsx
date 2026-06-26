import { redirect } from "next/navigation";
import { WorkspaceOrgSync } from "@/components/dashboard/workspace-org-sync";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export default async function ProjectWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/auth/sign-in?redirect=/projects/${projectId}`);

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", project.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  return (
    <>
      <WorkspaceOrgSync orgId={project.org_id} />
      {children}
    </>
  );
}
