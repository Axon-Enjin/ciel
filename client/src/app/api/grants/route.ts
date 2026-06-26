import { NextResponse } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/** Create (persist) a generated proposal draft. Role is enforced by RLS. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectId = String(body?.project_id ?? "");
  const funderId = body?.funder_id ? String(body.funder_id) : null;
  const title = String(body?.title ?? "Untitled proposal").slice(0, 200);
  const sections = Array.isArray(body?.sections) ? body.sections : null;
  const alignment = Array.isArray(body?.alignment) ? body.alignment : null;
  const amountPhp = body?.amount_php != null ? Number(body.amount_php) : null;

  if (!projectId || !sections) {
    return NextResponse.json({ error: "project_id and sections are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const insertRow: Record<string, unknown> = {
    project_id: projectId,
    funder_id: funderId,
    title,
    sections,
    amount_php: amountPhp,
    status: "draft",
  };
  if (alignment) insertRow.alignment = alignment;

  const { data, error } = await supabase
    .from("grant_proposals")
    .insert(insertRow)
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create proposal:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create proposal" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
