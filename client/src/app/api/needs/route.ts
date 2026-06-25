import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const need = String(body.need ?? "").trim();
  const orgId = String(body.org_id ?? "").trim();

  if (!orgId || need.length < 10) {
    return NextResponse.json(
      { error: "org_id and need (min 10 chars) are required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow) {
    await supabase.from("users").insert({
      id: user.id,
      email: user.email ?? "",
      display_name: user.user_metadata?.display_name ?? null,
    });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ org_id: orgId, need, status: "draft" })
    .select("id, org_id, need, status, created_at")
    .single();

  if (error) {
    console.error("Failed to create project:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project }, { status: 201 });
}
