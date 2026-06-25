// Supabase Server Client for Next.js 16
// Implements BUILD §4 golden-path pattern with async cookies()
// Date: 2026-06-25

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Creates a Supabase client for Server Components and Route Handlers.
 *
 * IMPORTANT: Next.js 16 - cookies() is async and must be awaited.
 * Uses getAll/setAll cookie API per @supabase/ssr requirements.
 *
 * RLS is automatically enforced - queries are scoped to the authenticated user's
 * organizations via the policies in migration 20260625000002_rls_policies.sql.
 *
 * @returns Supabase client configured for server-side use
 */
export async function createClient() {
  const cookieStore = await cookies(); // Next.js 16: cookies() is async — must await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render — safe to ignore
            // The proxy.ts will refresh the session on the next request
          }
        },
      },
    },
  );
}

/**
 * Gets the current authenticated user.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Gets the current user's organizations.
 * Returns empty array if not authenticated or no memberships.
 */
export async function getUserOrganizations() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      org_id,
      role,
      organizations (
        id,
        name,
        org_type,
        mission
      )
    `,
    )
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching user organizations:", error);
    return [];
  }

  return data || [];
}

/**
 * Checks if the current user has a specific role in an organization.
 * Admins automatically have all permissions.
 */
export async function hasOrgRole(orgId: string, requiredRole: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return false;
  }

  // Admins have all permissions
  return data.role === requiredRole || data.role === "admin";
}
