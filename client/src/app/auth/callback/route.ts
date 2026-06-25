// Auth callback route for magic link sign-in
// Handles Supabase auth redirects
// Date: 2026-06-25

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`,
      );
    }

    if (data.user) {
      await supabase.from("users").upsert({
        id: data.user.id,
        email: data.user.email ?? "",
        display_name: data.user.user_metadata?.display_name ?? null,
      });
    }
  }

  // Redirect to the next URL or dashboard
  return NextResponse.redirect(`${requestUrl.origin}${next}`);
}

// Made with Bob
