import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/** Update a proposal (sections / title / status / amount). Role enforced by RLS. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (Array.isArray(body.sections)) updates.sections = body.sections;
  if (Array.isArray(body.alignment)) updates.alignment = body.alignment;
  if (typeof body.title === "string") updates.title = body.title.slice(0, 200);
  if (typeof body.amount_php === "number" || body.amount_php === null) updates.amount_php = body.amount_php;
  if (typeof body.status === "string" && ["draft", "in_review", "final"].includes(body.status)) {
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grant_proposals")
    .update(updates)
    .eq("id", id)
    .select("id, title, status, amount_php, updated_at, alignment")
    .single();

  if (error || !data) {
    console.error("Failed to update proposal:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to update proposal" },
      { status: 500 },
    );
  }

  return NextResponse.json({ proposal: data });
}
