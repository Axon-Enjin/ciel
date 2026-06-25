import { NextResponse } from "next/server";
import { aiServiceHeaders, getAiServiceUrl } from "@/lib/ai-service";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const projectId = String(body.project_id ?? "");
  const need = String(body.need ?? "");
  const orgId = String(body.org_id ?? "");
  const context = body.context ?? {};

  if (!projectId || !orgId || need.length < 10) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", projectId)
    .single();

  if (!project || project.org_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const upstream = await fetch(`${getAiServiceUrl()}/toc/generate`, {
    method: "POST",
    headers: aiServiceHeaders(),
    body: JSON.stringify({
      project_id: projectId,
      org_id: orgId,
      need,
      context,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text();
    return NextResponse.json(
      { error: "AI service error", detail },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
