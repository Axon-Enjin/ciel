import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrganizations } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingForm } from "./onboarding-form";

export const metadata = {
  title: "Set up your workspace",
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in?redirect=/onboarding");
  }

  const organizations = await getUserOrganizations();
  if (organizations.length > 0) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Set up your workspace"
      subtitle="Tell us about your organization — you'll use this workspace for all projects and ToCs."
    >
      <OnboardingForm />
    </AuthShell>
  );
}
