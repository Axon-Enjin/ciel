import { NextResponse } from "next/server";
import { fieldIngestSchema, ingestFieldEntry } from "@/lib/field-ingest";
import { getCurrentUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = fieldIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid field entry payload" },
      { status: 400 },
    );
  }

  try {
    const result = await ingestFieldEntry(user, parsed.data);
    return NextResponse.json(
      {
        entry_id: result.entry_id,
        deduped: result.deduped,
        signals: result.signals,
      },
      { status: result.status },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to ingest field entry";
    const status =
      message === "Project not found"
        ? 404
        : message === "Forbidden"
          ? 403
          : message === "Lock a Theory of Change before recording field data."
            ? 409
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
