import { NextResponse } from "next/server";
import { getAiServiceUrl } from "@/lib/ai-service";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/** Record a web field indicator and trigger M&E signal evaluation. */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await ctx.params;
  const body = await request.json().catch(() => null);
  const indicator = String(body?.indicator ?? "").trim();
  const value = Number(body?.value);
  const observedAt = body?.observed_at
    ? String(body.observed_at)
    : new Date().toISOString();

  if (!indicator || Number.isNaN(value)) {
    return NextResponse.json(
      { error: "indicator and numeric value are required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", project.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: lockedToc } = await supabase
    .from("theories_of_change")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "locked")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lockedToc) {
    return NextResponse.json(
      { error: "Lock a Theory of Change before recording field data." },
      { status: 409 },
    );
  }

  let assumptionId: string | null = null;
  const { data: assumptions } = await supabase
    .from("toc_assumptions")
    .select("id, indicator")
    .eq("toc_id", lockedToc.id);

  const match = (assumptions ?? []).find((a) => a.indicator === indicator);
  if (match) assumptionId = match.id;

  const payload = { indicator, value, observed_at: observedAt };

  const { data: entry, error: entryError } = await supabase
    .from("field_entries")
    .insert({
      project_id: projectId,
      source: "web",
      payload,
      recorded_at: observedAt,
    })
    .select("id")
    .single();

  if (entryError || !entry) {
    return NextResponse.json(
      { error: entryError?.message ?? "Failed to record entry" },
      { status: 500 },
    );
  }

  const { error: pointError } = await supabase.from("indicator_points").insert({
    project_id: projectId,
    assumption_id: assumptionId,
    indicator,
    value,
    observed_at: observedAt,
  });

  if (pointError) {
    return NextResponse.json(
      { error: pointError.message ?? "Failed to record indicator" },
      { status: 500 },
    );
  }

  let signals: unknown[] = [];
  try {
    const upstream = await fetch(`${getAiServiceUrl()}/mande/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    if (upstream.ok) {
      const evaluated = await upstream.json();
      signals = evaluated.signals ?? [];
    }
  } catch {
    /* AI service optional in dev */
  }

  return NextResponse.json(
    { entry_id: entry.id, signals },
    { status: 201 },
  );
}
