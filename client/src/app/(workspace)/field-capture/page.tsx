import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUserOrganizations } from "@/lib/supabase/server";
import {
  resolveActiveOrgId,
  type WorkspaceMembership,
  withOrgQuery,
} from "@/lib/workspace-context";
import { Surface } from "@/components/ui/surface";
import { IconArrowUpRight, IconPin } from "@/components/dashboard/icons";

type ProjectRow = {
  id: string;
  need: string;
  status: string;
  org_id: string;
  theories_of_change: Array<{ status: string; version: number }> | null;
};

export const metadata = { title: "Field Capture — Ciel" };

export default async function FieldCapturePickerPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const memberships = (await getUserOrganizations()) as unknown as WorkspaceMembership[];
  if (memberships.length === 0) redirect("/onboarding");

  const params = await searchParams;
  const activeOrgId = resolveActiveOrgId(memberships, params.org);

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, need, status, org_id, theories_of_change(status, version)")
    .eq("org_id", activeOrgId)
    .order("created_at", { ascending: false });

  const projects = (data ?? []) as ProjectRow[];
  const lockable = projects.filter((project) =>
    (project.theories_of_change ?? []).some((toc) => toc.status === "locked"),
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <nav className="flex items-center gap-3 text-[13px]" aria-label="Breadcrumb">
        <Link
          href={withOrgQuery("/dashboard", activeOrgId)}
          className="text-[var(--color-primary)] hover:underline"
        >
          Dashboard
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="text-[var(--color-text-muted)]">Field capture</span>
      </nav>

      <header className="mb-6 mt-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
          Offline-ready capture
        </p>
        <h1 className="mt-2 font-display text-[clamp(1.6rem,3.5vw,2.2rem)] font-semibold text-[var(--color-text)]">
          Choose a project to capture from
        </h1>
      </header>

      {lockable.length === 0 ? (
        <Surface className="p-6" elevation="sm">
          <p className="text-sm text-[var(--color-text-muted)]">
            No projects with locked Theories of Change yet. Lock one first, then
            field capture can map entries to assumptions.
          </p>
        </Surface>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lockable.map((project) => (
            <Link
              key={project.id}
              href={withOrgQuery(`/projects/${project.id}/capture`, activeOrgId)}
              className="group rounded-[18px] bg-[color-mix(in_srgb,var(--color-border)_35%,transparent)] p-1.5 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <div className="flex h-full items-start gap-3 rounded-[12px] bg-[var(--color-surface)] p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)]">
                  <IconPin size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[14px] font-semibold text-[var(--color-text)]">
                    {project.need}
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                    Tap to open field capture
                  </p>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] text-[var(--color-text)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:bg-[var(--color-primary)] group-hover:text-white">
                  <IconArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
