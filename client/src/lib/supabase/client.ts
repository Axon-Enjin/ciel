// Supabase Browser Client for Next.js 16
// For use in Client Components only
// Date: 2026-06-25

import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for Client Components.
 *
 * This client automatically handles cookie management in the browser.
 * Use this in Client Components that need real-time subscriptions or
 * client-side auth state management.
 *
 * For Server Components and Route Handlers, use createClient from
 * lib/supabase/server.ts instead.
 *
 * @returns Supabase client configured for browser use
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Made with Bob
