import Link from "next/link";
import { getUserOrganizations } from "@/lib/supabase/server";
import { resolveActiveOrgId, type WorkspaceMembership } from "@/lib/workspace-context";
import { NeedIntakeForm } from "./need-intake-form";

export const metadata = {
  title: "New project — Ciel",
};

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const organizations = (await getUserOrganizations()) as unknown as WorkspaceMembership[];
  const params = await searchParams;
  const orgId = resolveActiveOrgId(organizations, params.org);

  return (
    <div className="mx-auto max-w-2xl">
      <nav className="flex items-center gap-3 text-[13px]" aria-label="Breadcrumb">
        <Link href={`/dashboard?org=${orgId}`} className="text-[var(--color-primary)] hover:underline">
          Dashboard
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="text-[var(--color-text-muted)]">Need intake</span>
      </nav>
      <h1 className="mt-4 font-display text-3xl text-[var(--color-text)]">
        Need intake
      </h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        Start with the social need. Ciel will ground your Theory of Change in evidence.
      </p>
      <div className="mt-8 rounded-[var(--radius-surface)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:p-8">
        <NeedIntakeForm orgId={orgId} />
      </div>
    </div>
  );
}
