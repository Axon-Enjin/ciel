import { NextResponse } from "next/server";
import { getAiServiceUrl } from "@/lib/ai-service";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tocId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const acknowledgedCritiqueIds: string[] = body.acknowledged_critique_ids ?? [];

  const supabase = await createClient();
  const { data: toc } = await supabase
    .from("theories_of_change")
    .select("id, project_id, status")
    .eq("id", tocId)
    .single();

  if (!toc) {
    return NextResponse.json({ error: "ToC not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("org_id")
    .eq("id", toc.project_id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const upstream = await fetch(`${getAiServiceUrl()}/toc/${tocId}/lock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      toc_id: tocId,
      acknowledged_critique_ids: acknowledgedCritiqueIds,
    }),
  });

  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
