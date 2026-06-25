import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "./sign-in-form";

export const metadata = {
  title: "Sign in",
  description: "Sign in to your Ciel workspace",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const redirectTo = params.redirect || "/dashboard";

  if (user) {
    redirect(redirectTo);
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Access your Impact Operating System workspace."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href={
              params.redirect
                ? `/auth/sign-up?redirect=${encodeURIComponent(params.redirect)}`
                : "/auth/sign-up"
            }
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <SignInForm redirectTo={params.redirect} />
    </AuthShell>
  );
}
