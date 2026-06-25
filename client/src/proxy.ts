// Ciel Proxy (Next.js 16 - replaces middleware.ts)
// Handles Supabase auth session refresh
// Date: 2026-06-25

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy function for Next.js 16 (replaces middleware).
 *
 * IMPORTANT: Next.js 16 renamed middleware.ts to proxy.ts and the export
 * from `middleware()` to `proxy()`. This runs on Node runtime only (not Edge).
 *
 * Refreshes Supabase auth session on every request to keep users logged in.
 * Sets/updates auth cookies as needed.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session if expired - required for Server Components
  // IMPORTANT: This must come before any early returns
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect authenticated routes
  if (
    !user &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/projects") ||
      request.nextUrl.pathname.startsWith("/onboarding") ||
      request.nextUrl.pathname.startsWith("/toc"))
  ) {
    // Redirect to sign-in with return URL
    const url = request.nextUrl.clone();
    url.pathname = "/auth/sign-in";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, images, and public assets.
     * API routes handle their own auth.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// Made with Bob
