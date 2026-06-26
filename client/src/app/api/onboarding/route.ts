import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

const ORG_TYPES = ["ngo", "lgu", "foundation", "csr"] as const;
type OrgType = (typeof ORG_TYPES)[number];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const orgType = String(body.org_type ?? "").trim();
  const mission = String(body.mission ?? "").trim() || null;
  const region = String(body.region ?? "").trim() || null;

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Organization name must be at least 2 characters" },
      { status: 400 },
    );
  }
  if (!ORG_TYPES.includes(orgType as OrgType)) {
    return NextResponse.json(
      { error: `org_type must be one of: ${ORG_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // Ensure the user row exists (FK target for memberships.user_id).
  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow) {
    const { error: userError } = await supabase.from("users").insert({
      id: user.id,
      email: user.email ?? "",
      display_name: user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? null,
    });
    if (userError) {
      console.error("Failed to create user row:", userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }
  }

  // Atomic org + admin membership creation (SECURITY DEFINER RPC).
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_org_type: orgType,
    p_mission: mission,
    p_region: region,
  });

  if (error || !orgId) {
    console.error("Failed to create organization:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create organization" },
      { status: 500 },
    );
  }

  return NextResponse.json({ org_id: orgId }, { status: 201 });
}
