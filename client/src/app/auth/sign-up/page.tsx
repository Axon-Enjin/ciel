import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "./sign-up-form";

export const metadata = {
  title: "Create account",
  description: "Create your Ciel account",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const redirectTo = params.redirect || "/onboarding";

  if (user) {
    redirect(redirectTo);
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with a grounded Theory of Change in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={
              params.redirect
                ? `/auth/sign-in?redirect=${encodeURIComponent(params.redirect)}`
                : "/auth/sign-in"
            }
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm redirectTo={params.redirect} />
    </AuthShell>
  );
}
