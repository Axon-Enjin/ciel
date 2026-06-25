"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthAlert } from "@/components/auth/auth-alert";

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.user) {
        await supabase.from("users").upsert({
          id: data.user.id,
          email: data.user.email ?? email,
          display_name: data.user.user_metadata?.display_name ?? null,
        });
      }

      router.push(redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      const redirect = redirectTo
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        : `${window.location.origin}/auth/callback`;

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect },
      });

      if (otpError) {
        setError(otpError.message);
        return;
      }

      setMessage("Check your email for a magic link to sign in.");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <AuthAlert variant="error">{error}</AuthAlert>}
      {message && <AuthAlert variant="success">{message}</AuthAlert>}

      <form onSubmit={handleSignIn} className="space-y-4">
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="maria@example.org"
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <div className="flex justify-end">
          <Link
            href="/auth/reset-password"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-border)]" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[var(--color-surface)] px-2 text-[var(--color-text-muted)]">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        disabled={loading || !email}
        className="w-full"
        onClick={handleMagicLink}
      >
        {loading ? "Sending…" : "Email me a magic link"}
      </Button>
    </div>
  );
}
