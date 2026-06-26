import { NextResponse } from "next/server";
import { aiServiceHeaders, getAiServiceUrl } from "@/lib/ai-service";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * Stream a funder-matched proposal draft (PRD-F2 / US-02).
 *
 * Preconditions enforced here (the AI service is stateless): the caller must be
 * a program/admin of the project's org, the project must have a LOCKED ToC, and
 * a valid funder must be selected. We load the ToC graph + assumptions + org +
 * funder under the user's RLS session, then proxy the stream from the AI service.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const projectId = String(body?.project_id ?? "");
  const funderId = String(body?.funder_id ?? "");
  const amountPhp = body?.amount_php != null ? Number(body.amount_php) : null;
  const onlySection = body?.only_section ? String(body.only_section) : null;

  if (!projectId || !funderId) {
    return NextResponse.json({ error: "project_id and funder_id are required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id, need, organizations ( name, mission )")
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

  if (!membership || !["program", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: toc } = await supabase
    .from("theories_of_change")
    .select("id, graph, status, version")
    .eq("project_id", projectId)
    .eq("status", "locked")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!toc) {
    return NextResponse.json(
      { error: "A locked Theory of Change is required before drafting a proposal." },
      { status: 409 },
    );
  }

  const { data: assumptions } = await supabase
    .from("toc_assumptions")
    .select("statement, indicator, threshold")
    .eq("toc_id", toc.id);

  const { data: funder } = await supabase
    .from("funders")
    .select("id, name, type, region, focus_areas, kpis, priorities")
    .eq("id", funderId)
    .single();

  if (!funder) {
    return NextResponse.json({ error: "Funder not found" }, { status: 404 });
  }

  const org = (Array.isArray(project.organizations)
    ? project.organizations[0]
    : project.organizations) as { name: string; mission: string | null } | null;

  const upstream = await fetch(`${getAiServiceUrl()}/grants/generate`, {
    method: "POST",
    headers: aiServiceHeaders(),
    body: JSON.stringify({
      project_id: projectId,
      org_id: project.org_id,
      need: project.need,
      org_name: org?.name ?? "the organization",
      org_mission: org?.mission ?? null,
      funder,
      toc_graph: toc.graph,
      assumptions: assumptions ?? [],
      amount_php: amountPhp,
      only_section: onlySection,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text();
    return NextResponse.json({ error: "AI service error", detail }, { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
