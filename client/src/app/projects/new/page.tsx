import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, getUserOrganizations } from "@/lib/supabase/server";
import { NeedIntakeForm } from "./need-intake-form";

export const metadata = {
  title: "New project — Ciel",
};

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in?redirect=/projects/new");
  }

  const organizations = await getUserOrganizations();
  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const orgId =
    params.org ??
    (organizations[0] as { org_id: string }).org_id;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard"
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-display text-3xl text-[var(--color-text)]">
          Need intake
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Start with the social need. Ciel will ground your Theory of Change in evidence.
        </p>
        <div className="mt-8 rounded-[var(--radius-surface)] border border-[var(--color-border)] bg-white p-6 md:p-8">
          <NeedIntakeForm orgId={orgId} />
        </div>
      </div>
    </main>
  );
}
