// Dashboard — Ciel app overview (Product Mode, DSD §0/§2).
// Real workspace data: organizations, projects + latest ToC status, signals.

import { redirect } from "next/navigation";
import { createClient, getCurrentUser, getUserOrganizations } from "@/lib/supabase/server";
import { DashboardShell, type ShellOrg } from "@/components/dashboard/dashboard-shell";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProjectCard } from "@/components/dashboard/project-card";
import { EmptyProjects } from "@/components/dashboard/empty-projects";
import { SignalDemoCard } from "@/components/dashboard/signal-demo-card";
import { DawnReveal } from "@/components/motion/dawn-reveal";
import { IconHorizon, IconNodes, IconPin, IconReport, IconArrowUpRight } from "@/components/dashboard/icons";

export const metadata = {
  title: "Overview — Ciel",
  description: "Your Ciel impact workspace",
};

type OrgRel = { id: string; name: string; org_type: string; mission: string | null };
type Membership = { org_id: string; role: string; organizations: OrgRel | OrgRel[] };

type TocRel = { version: number; status: string };
type ProjectRow = {
  id: string;
  need: string;
  status: string;
  created_at: string;
  theories_of_change: TocRel[] | null;
};

function orgOf(m: Membership): OrgRel {
  return Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
}

function latestToc(tocs: TocRel[] | null): TocRel | null {
  if (!tocs || tocs.length === 0) return null;
  return [...tocs].sort((a, b) => b.version - a.version)[0];
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const memberships = (await getUserOrganizations()) as unknown as Membership[];
  if (memberships.length === 0) redirect("/onboarding");

  const params = await searchParams;
  const activeOrgId =
    params.org && memberships.some((m) => m.org_id === params.org)
      ? params.org
      : memberships[0].org_id;

  const activeMembership = memberships.find((m) => m.org_id === activeOrgId) ?? memberships[0];
  const activeOrg = orgOf(activeMembership);

  const orgs: ShellOrg[] = memberships.map((m) => {
    const o = orgOf(m);
    return { id: m.org_id, name: o.name, role: m.role, type: o.org_type };
  });

  const supabase = await createClient();
  const { data: projectData } = await supabase
    .from("projects")
    .select("id, need, status, created_at, theories_of_change ( version, status )")
    .eq("org_id", activeOrgId)
    .order("created_at", { ascending: false });

  const projects = (projectData ?? []) as ProjectRow[];

  const total = projects.length;
  const activeCount = projects.filter((p) => p.status === "active" || p.status === "scaling").length;
  const lockedCount = projects.filter((p) => latestToc(p.theories_of_change)?.status === "locked").length;
  const signalsToReview = 1; // demo F3 slice — one ADAPT signal

  return (
    <DashboardShell user={{ email: user.email ?? "" }} orgs={orgs} activeOrgId={activeOrgId}>
      {/* Hero — the org's mission is the hero (DSD §0) */}
      <DawnReveal as="header" className="mb-10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
          <span className="capitalize">{activeOrg.org_type}</span> workspace
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-fraunces)] text-[clamp(2rem,4.5vw,2.9rem)] font-semibold leading-[1.05] tracking-tight text-[var(--color-text)]">
          {greeting()}.
          <span className="block text-[var(--color-text-muted)]">{activeOrg.name}</span>
        </h1>
        {activeOrg.mission ? (
          <p className="mt-5 max-w-2xl border-l-2 border-[var(--color-accent)] pl-4 font-[family-name:var(--font-fraunces)] text-[clamp(1.05rem,2.2vw,1.35rem)] italic leading-snug text-[var(--color-text)]">
            {activeOrg.mission}
          </p>
        ) : (
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--color-text-muted)]">
            Ground a social need in evidence, shape a Theory of Change, and watch the signals that
            tell you when to scale, adapt — or stop.
          </p>
        )}
      </DawnReveal>

      {/* KPI row */}
      <DawnReveal className="mb-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Projects"
            value={total}
            hint={total === 0 ? "Nothing yet — start one" : "Across this workspace"}
            accent="var(--color-primary)"
            horizon
            icon={<IconHorizon size={18} />}
          />
          <StatCard
            label="In motion"
            value={activeCount}
            hint="Active or scaling"
            accent="var(--color-success)"
            icon={<IconNodes size={18} />}
          />
          <StatCard
            label="ToCs locked"
            value={lockedCount}
            hint="Evidence-grounded & committed"
            accent="var(--color-data)"
          />
          <StatCard
            label="Signals"
            value={signalsToReview}
            hint="Awaiting your review"
            accent="var(--color-accent)"
          />
        </div>
      </DawnReveal>

      {/* Projects */}
      <DawnReveal as="section" className="mb-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              Theories of Change
            </p>
            <h2 className="mt-1.5 font-[family-name:var(--font-fraunces)] text-[clamp(1.5rem,3vw,1.9rem)] font-semibold tracking-tight text-[var(--color-text)]">
              Your projects
            </h2>
          </div>
          {total > 0 ? (
            <a
              href={`/projects/new?org=${activeOrgId}`}
              className="group hidden items-center gap-2 text-[13px] font-semibold text-[var(--color-primary)] sm:inline-flex"
            >
              New project
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px]">
                <IconArrowUpRight size={15} />
              </span>
            </a>
          ) : null}
        </div>

        {total === 0 ? (
          <EmptyProjects orgId={activeOrgId} />
        ) : (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {projects.map((p) => {
              const toc = latestToc(p.theories_of_change);
              return (
                <ProjectCard
                  key={p.id}
                  id={p.id}
                  need={p.need}
                  status={p.status}
                  createdAt={p.created_at}
                  tocStatus={toc?.status ?? null}
                  tocVersion={toc?.version ?? null}
                />
              );
            })}
          </div>
        )}
      </DawnReveal>

      {/* Signals */}
      <section id="signals" className="mb-14 scroll-mt-20">
        <DawnReveal>
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              Predictive M&amp;E
            </p>
            <h2 className="mt-1.5 font-[family-name:var(--font-fraunces)] text-[clamp(1.5rem,3vw,1.9rem)] font-semibold tracking-tight text-[var(--color-text)]">
              Latest signal
            </h2>
          </div>
          <SignalDemoCard />
        </DawnReveal>
      </section>

      {/* Coming next */}
      <DawnReveal as="section">
        <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
          Coming in the next slice
        </p>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {[
            {
              icon: <IconPin size={22} />,
              title: "Field Capture",
              body: "Offline-first PWA + SMS ingestion so frontline workers log evidence from anywhere — even with no signal.",
            },
            {
              icon: <IconReport size={22} />,
              title: "Impact Reports",
              body: "Donor-ready reports drawn straight from your locked ToC and live indicators — the dawn line is your own data.",
            },
          ].map((c) => (
            <div
              key={c.title}
              aria-disabled
              className="rounded-[20px] bg-[color-mix(in_srgb,var(--color-border)_35%,transparent)] p-1.5"
            >
              <div className="flex h-full items-start gap-4 rounded-[14px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[color-mix(in_srgb,var(--color-text)_5%,transparent)] text-[var(--color-text-muted)]">
                  {c.icon}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-[var(--color-text)]">{c.title}</h3>
                    <span className="rounded-full bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      Soon
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-text-muted)]">{c.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DawnReveal>
    </DashboardShell>
  );
}
