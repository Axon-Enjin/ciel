import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const orgType = String(body.org_type ?? "").trim();
  const missionRaw = String(body.mission ?? "").trim();
  const regionRaw = String(body.region ?? "").trim();

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Organization name must be at least 2 characters" },
      { status: 400 },
    );
  }

  const allowedOrgTypes = new Set(["ngo", "lgu", "foundation", "csr"]);
  if (!allowedOrgTypes.has(orgType)) {
    return NextResponse.json({ error: "Invalid organization type" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error: userError } = await supabase.from("users").upsert({
    id: user.id,
    email: user.email ?? "",
    display_name: user.user_metadata?.display_name ?? (user.email ?? "").split("@")[0],
  });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      org_type: orgType,
      mission: missionRaw || null,
      region: regionRaw || null,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    const isRlsDenied = orgError?.message?.toLowerCase().includes("row-level security");
    return NextResponse.json(
      {
        error: orgError?.message ?? "Failed to create organization",
        hint: isRlsDenied
          ? "RLS denied insert on organizations. Ensure migrations 20260625000002_rls_policies.sql and 20260625000004_onboarding_membership.sql are applied in Supabase."
          : undefined,
      },
      { status: 400 },
    );
  }

  const { error: membershipError } = await supabase.from("memberships").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
  });

  if (membershipError) {
    return NextResponse.json(
      {
        error: membershipError.message,
        hint: "If this is an RLS error, apply migration 20260625000004_onboarding_membership.sql.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, org_id: org.id }, { status: 201 });
}
