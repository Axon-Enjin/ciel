import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FieldCaptureScreen } from "@/components/mande/field-capture-screen";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { withOrgQuery } from "@/lib/workspace-context";

export const metadata = { title: "Field Capture — Ciel" };

export default async function ProjectFieldCapturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, need")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/dashboard");

  const { data: lockedToc } = await supabase
    .from("theories_of_change")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "locked")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const assumptions = lockedToc
    ? await supabase
        .from("toc_assumptions")
        .select("id, statement, indicator, threshold")
        .eq("toc_id", lockedToc.id)
        .order("created_at", { ascending: true })
        .then((res) => res.data ?? [])
    : [];

  const dashboardHref = withOrgQuery("/dashboard", project.org_id);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <nav className="flex flex-wrap items-center gap-3 text-[13px]" aria-label="Breadcrumb">
        <Link href={dashboardHref} className="text-[var(--color-primary)] hover:underline">
          Dashboard
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <Link href={`/projects/${projectId}`} className="text-[var(--color-primary)] hover:underline">
          Project
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="text-[var(--color-text-muted)]">Field capture</span>
      </nav>

      <header className="mt-6 mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
          Offline-ready capture
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.1rem)] font-semibold leading-tight text-[var(--color-text)]">
          Field Capture
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          {project.need}
        </p>
      </header>

      {lockedToc ? (
        <FieldCaptureScreen
          projectId={projectId}
          projectNeed={project.need}
          assumptions={assumptions}
        />
      ) : (
        <Surface className="p-6" elevation="sm">
          <p className="text-sm text-[var(--color-text-muted)]">
            Lock your Theory of Change first so field entries map to assumptions.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href={`/projects/${projectId}/toc`}>Go to ToC Studio</Link>
            </Button>
          </div>
        </Surface>
      )}
    </div>
  );
}
