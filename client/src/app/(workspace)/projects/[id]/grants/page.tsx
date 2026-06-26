import { redirect } from "next/navigation";

import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { GrantGeneratePanel } from "@/components/grants/grant-generate-panel";

import type { Funder, ProposalSummary } from "@/components/grants/types";

import { IconNodes, IconArrowUpRight, IconReport } from "@/components/dashboard/icons";

import { withOrgQuery } from "@/lib/workspace-context";



export const metadata = { title: "Grant Workspace — Ciel" };



const STATUS_TONE: Record<string, string> = {

  draft: "var(--color-text-muted)",

  in_review: "var(--color-data)",

  final: "var(--color-success)",

};



export default async function GrantsPage({ params }: { params: Promise<{ id: string }> }) {

  const { id: projectId } = await params;



  const supabase = await createClient();

  const { data: project } = await supabase

    .from("projects")

    .select("id, org_id, need")

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

    .select("id, version")

    .eq("project_id", projectId)

    .eq("status", "locked")

    .order("version", { ascending: false })

    .limit(1)

    .maybeSingle();



  const { data: funderData } = await supabase

    .from("funders")

    .select("id, name, type, region, focus_areas, kpis, typical_grant_php_min, typical_grant_php_max")

    .order("name");

  const funders = (funderData ?? []) as Funder[];

  const funderName = new Map(funders.map((f) => [f.id, f.name]));



  const { data: proposalData } = await supabase

    .from("grant_proposals")

    .select("id, title, status, funder_id, amount_php, updated_at")

    .eq("project_id", projectId)

    .order("updated_at", { ascending: false });

  const proposals = (proposalData ?? []) as ProposalSummary[];



  const canWrite = membership && ["program", "admin"].includes(membership.role);

  const dashboardHref = withOrgQuery("/dashboard", project.org_id);



  return (

    <div className="mx-auto w-full max-w-4xl">

      <div className="flex items-center gap-3 text-[13px]">

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

        <Link href={`/projects/${projectId}/toc`} className="text-[var(--color-primary)] hover:underline">

          ToC Studio

        </Link>

        <span className="text-[var(--color-text-muted)]">/</span>

        <span className="text-[var(--color-text-muted)]">Grants</span>

      </div>



      <header className="mt-6">

        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">

          Grant Workspace

        </p>

        <h1 className="mt-2 font-[family-name:var(--font-fraunces)] text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-[1.06] tracking-tight text-[var(--color-text)]">

          Turn your locked Theory of Change into funded proposals

        </h1>

        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--color-text-muted)]">

          {project.need}

        </p>

      </header>



      {proposals.length > 0 ? (

        <section className="mt-10">

          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">

            Proposals

          </p>

          <div className="grid gap-3 sm:grid-cols-2">

            {proposals.map((p) => (

              <Link

                key={p.id}

                href={`/projects/${projectId}/grants/${p.id}`}

                className="group rounded-[16px] bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] p-1.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5"

              >

                <div className="flex items-start gap-3 rounded-[11px] bg-[var(--color-surface)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">

                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] text-[var(--color-primary)]">

                    <IconReport size={18} />

                  </span>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-[14px] font-semibold text-[var(--color-text)]">

                      {p.title ?? "Untitled proposal"}

                    </p>

                    <p className="mt-0.5 truncate text-[12px] text-[var(--color-text-muted)]">

                      {p.funder_id ? funderName.get(p.funder_id) ?? "—" : "No funder"}

                      {p.amount_php ? ` · ₱${p.amount_php.toLocaleString("en-PH")}` : ""}

                    </p>

                    <span

                      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"

                      style={{

                        color: STATUS_TONE[p.status],

                        backgroundColor: `color-mix(in srgb, ${STATUS_TONE[p.status]} 12%, transparent)`,

                      }}

                    >

                      {p.status.replace("_", " ")}

                    </span>

                  </div>

                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] text-[var(--color-text)] transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-[var(--color-primary)] group-hover:text-white">

                    <IconArrowUpRight size={15} />

                  </span>

                </div>

              </Link>

            ))}

          </div>

        </section>

      ) : null}



      <section className="mt-10">

        {!lockedToc ? (

          <div className="rounded-[24px] bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] p-1.5">

            <div className="rounded-[18px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">

              <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[var(--color-accent)]">

                <IconNodes size={26} />

              </span>

              <h3 className="mt-5 font-[family-name:var(--font-fraunces)] text-[20px] font-semibold text-[var(--color-text)]">

                Lock a Theory of Change first

              </h3>

              <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[var(--color-text-muted)]">

                A proposal is only as strong as the logic beneath it. Ground and lock your ToC,

                then Ciel drafts a funder-matched proposal from it.

              </p>

              <Link

                href={`/projects/${projectId}/toc`}

                className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] py-2.5 pl-5 pr-2 text-[14px] font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--color-primary-hover)]"

              >

                Go to ToC Studio

                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-[1px]">

                  <IconArrowUpRight size={16} />

                </span>

              </Link>

            </div>

          </div>

        ) : !canWrite ? (

          <p className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[13px] text-[var(--color-text-muted)]">

            Your role can view proposals but not draft them. Ask an admin or program lead to draft.

          </p>

        ) : (

          <>

            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">

              Draft a new proposal

            </p>

            <GrantGeneratePanel projectId={projectId} funders={funders} />

          </>

        )}

      </section>

    </div>

  );

}


