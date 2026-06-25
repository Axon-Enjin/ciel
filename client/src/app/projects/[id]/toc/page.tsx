import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { TocStudio } from "@/components/toc/toc-studio";

export const metadata = {
  title: "ToC Studio — Ciel",
};

export default async function ProjectTocPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ generate?: string }>;
}) {
  const { id: projectId } = await params;
  const { generate } = await searchParams;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth/sign-in?redirect=/projects/${projectId}/toc`);
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, need, status")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect("/dashboard");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", project.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          ← Dashboard
        </Link>
        <div className="mt-6">
          <TocStudio
            projectId={project.id}
            orgId={project.org_id}
            need={project.need}
            autoGenerate={generate === "1"}
          />
        </div>
      </div>
    </main>
  );
}
