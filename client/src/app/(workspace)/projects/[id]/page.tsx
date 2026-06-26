import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AssumptionMonitor } from "@/components/mande/assumption-monitor";
import { FieldEntryForm } from "@/components/mande/field-entry-form";
import { SignalCard } from "@/components/mande/signal-card";
import type {
  IndicatorPointRow,
  MandeSignal,
  TocAssumptionRow,
} from "@/components/mande/types";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { IconArrowUpRight, IconNodes, IconReport } from "@/components/dashboard/icons";
import { withOrgQuery } from "@/lib/workspace-context";

export const metadata = { title: "Project Dashboard — Ciel" };

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, need, status")
    .eq("id", projectId)
    .single();

  if (!project) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", project.org_id)
    .maybeSingle();

  const { data: lockedToc } = await supabase
    .from("theories_of_change")
    .select("id, version, status")
    .eq("project_id", projectId)
    .eq("status", "locked")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  let assumptions: TocAssumptionRow[] = [];
  if (lockedToc) {
    const { data: assumptionRows } = await supabase
      .from("toc_assumptions")
      .select("id, statement, indicator, threshold")
      .eq("toc_id", lockedToc.id)
      .order("created_at", { ascending: true });
    assumptions = (assumptionRows ?? []) as TocAssumptionRow[];
  }

  const { data: pointRows } = await supabase
    .from("indicator_points")
    .select("indicator, value, observed_at")
    .eq("project_id", projectId)
    .order("observed_at", { ascending: false })
    .limit(30);

  const points = (pointRows ?? []) as IndicatorPointRow[];

  const { data: signalRows } = await supabase
    .from("signals")
    .select("id, assumption_id, signal_type, rationale, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5);

  const signals = (signalRows ?? []) as MandeSignal[];

  const canWrite = membership && ["program", "admin"].includes(membership.role);
  const dashboardHref = withOrgQuery("/dashboard", project.org_id);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <nav
        className="flex flex-wrap items-center gap-3 text-[13px]"
        aria-label="Breadcrumb"
      >
        <Link href={dashboardHref} className="text-[var(--color-primary)] hover:underline">
          Dashboard
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="line-clamp-1 text-[var(--color-text-muted)]">Project</span>
      </nav>

      <header className="mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
          Project dashboard
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-tight text-[var(--color-text)]">
          Monitoring &amp; signals
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          {project.need}
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" asChild>
          <Link href={`/projects/${projectId}/toc`}>
            <IconNodes size={16} />
            ToC Studio
          </Link>
        </Button>
        {lockedToc && (
          <Button variant="secondary" asChild>
            <Link href={`/projects/${projectId}/grants`}>
              <IconReport size={16} />
              Grant workspace
            </Link>
          </Button>
        )}
      </div>

      {!lockedToc ? (
        <Surface className="mt-10 p-8 text-center" elevation="sm">
          <p className="font-display text-lg font-semibold text-[var(--color-text)]">
            Lock your Theory of Change first
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Assumptions and M&amp;E signals are extracted when you lock a ToC.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href={`/projects/${projectId}/toc`}>
                Go to ToC Studio
                <IconArrowUpRight size={16} />
              </Link>
            </Button>
          </div>
        </Surface>
      ) : (
        <div className="mt-10 space-y-10">
          <section aria-labelledby="signals-heading">
            <h2
              id="signals-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]"
            >
              Latest signals
            </h2>
            {signals.length > 0 ? (
              <div className="mt-4 space-y-4">
                {signals.map((s) => (
                  <SignalCard key={s.id} signal={s} />
                ))}
              </div>
            ) : (
              <Surface className="mt-4 p-6" elevation="sm">
                <p className="text-sm text-[var(--color-text-muted)]">
                  No scale, adapt, or stop signals yet — indicators are on
                  track, or record field data below.
                </p>
              </Surface>
            )}
          </section>

          <section aria-labelledby="assumptions-heading">
            <h2
              id="assumptions-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]"
            >
              Locked assumptions
            </h2>
            <div className="mt-4">
              <AssumptionMonitor assumptions={assumptions} points={points} />
            </div>
          </section>

          {canWrite && (
            <section aria-labelledby="field-entry-heading">
              <h2 id="field-entry-heading" className="sr-only">
                Record field data
              </h2>
              <FieldEntryForm projectId={projectId} assumptions={assumptions} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
