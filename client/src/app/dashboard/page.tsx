// Dashboard page for Ciel
// Placeholder for authenticated users
// Date: 2026-06-25

import { redirect } from "next/navigation";
import { SignalDemoCard } from "@/components/dashboard/signal-demo-card";
import { createClient, getCurrentUser, getUserOrganizations } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard - Ciel",
  description: "Your Ciel dashboard",
};

type DashboardMembership = {
  org_id: string;
  role: string;
  organizations: { name: string; org_type: string };
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const organizations = await getUserOrganizations();

  // If user has no organizations, redirect to onboarding
  if (organizations.length === 0) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-semibold text-[var(--color-text)]">
            Dashboard
          </h1>
          <p className="mt-2 text-[var(--color-text)]/70">
            Welcome back, {user.email}
          </p>
        </div>

        {/* Organizations */}
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-6">
          <h2 className="text-xl font-display font-semibold text-[var(--color-text)] mb-4">
            Your Organizations
          </h2>
          <div className="space-y-4">
            {(organizations as unknown as DashboardMembership[]).map((membership) => (
              <div
                key={membership.org_id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-4"
              >
                <div>
                  <h3 className="font-medium text-[var(--color-text)]">
                    {membership.organizations.name}
                  </h3>
                  <p className="text-sm text-[var(--color-text)]/60">
                    {membership.organizations.org_type} · {membership.role}
                  </p>
                </div>
                <a
                  href={`/projects/new?org=${membership.org_id}`}
                  className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary)]/90"
                >
                  New Project
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* M&E signal preview (thin F3 demo) */}
        <div className="mt-8">
          <h2 className="text-xl font-display font-semibold text-[var(--color-text)] mb-4">
            Latest signal
          </h2>
          <SignalDemoCard />
        </div>

        {/* Quick actions */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <a
            href="/projects/new"
            className="rounded-lg border border-[var(--color-border)] bg-white p-6 hover:border-[var(--color-primary)] transition-colors"
          >
            <h3 className="font-display font-semibold text-[var(--color-text)]">
              New Project
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text)]/70">
              Start a new Theory of Change
            </p>
          </a>

          <div
            aria-disabled="true"
            className="rounded-lg border border-dashed border-[var(--color-border)] bg-white p-6 opacity-60"
          >
            <h3 className="font-display font-semibold text-[var(--color-text)]">
              Field Capture
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text)]/70">
              Record field data — coming in the next slice
            </p>
          </div>

          <div
            aria-disabled="true"
            className="rounded-lg border border-dashed border-[var(--color-border)] bg-white p-6 opacity-60"
          >
            <h3 className="font-display font-semibold text-[var(--color-text)]">
              Reports
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text)]/70">
              View impact reports — coming in the next slice
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// Made with Bob
