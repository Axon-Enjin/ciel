import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TocStudio } from "@/components/toc/toc-studio";
import type { FailurePrompt, TocGraph } from "@/components/toc/types";
import { withOrgQuery } from "@/lib/workspace-context";

export const metadata = {
  title: "ToC Studio — Ciel",
};

export default async function ProjectTocPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    generate?: string;
    region?: string;
    population?: string;
  }>;
}) {
  const { id: projectId } = await params;
  const { generate, region, population } = await searchParams;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, need, status")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect("/dashboard");
  }

  const { data: tocRow } = await supabase
    .from("theories_of_change")
    .select("id, graph, status, version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initialGraph: TocGraph | null = null;
  let initialCritiques: FailurePrompt[] = [];
  let initialStatus: "draft" | "locked" | null = null;
  let initialTocId: string | null = null;

  if (tocRow?.graph) {
    const graph = tocRow.graph as TocGraph;
    initialGraph = {
      nodes: graph.nodes ?? [],
      edges: graph.edges ?? [],
    };
    initialStatus = tocRow.status as "draft" | "locked";
    initialTocId = tocRow.id;

    const { data: critiqueRows } = await supabase
      .from("toc_critiques")
      .select("id, prompt, source_ids, acknowledged")
      .eq("toc_id", tocRow.id)
      .order("created_at", { ascending: true });

    initialCritiques = (critiqueRows ?? []).map((c) => ({
      id: c.id,
      prompt: c.prompt,
      source_ids: c.source_ids ?? [],
      acknowledged: c.acknowledged,
    }));
  }

  const context: Record<string, string> = {};
  if (region) context.region = region;
  if (population) context.population = population;

  const shouldAutoGenerate =
    generate === "1" && initialStatus !== "locked" && !initialGraph?.nodes.length;

  const dashboardHref = withOrgQuery("/dashboard", project.org_id);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <nav className="flex items-center gap-3 text-[13px]" aria-label="Breadcrumb">
        <Link href={dashboardHref} className="text-[var(--color-primary)] hover:underline">
          Dashboard
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <Link
          href={`/projects/${projectId}`}
          className="text-[var(--color-primary)] hover:underline"
        >
          Project
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="text-[var(--color-text-muted)]">ToC Studio</span>
      </nav>

      <div className="mt-6">
        <TocStudio
          projectId={project.id}
          orgId={project.org_id}
          need={project.need}
          context={context}
          autoGenerate={shouldAutoGenerate}
          initialGraph={initialGraph}
          initialCritiques={initialCritiques}
          initialStatus={initialStatus}
          initialTocId={initialTocId}
        />
      </div>
    </div>
  );
}
