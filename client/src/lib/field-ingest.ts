import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { aiServiceJsonHeaders, getAiServiceUrl } from "@/lib/ai-service";
import { createClient } from "@/lib/supabase/server";

export const fieldValueSchema = z.object({
  indicator: z.string().trim().min(1),
  value: z.number(),
  observed_at: z.string().datetime().optional(),
});

export const fieldIngestSchema = z.object({
  client_uuid: z.string().uuid(),
  project_id: z.string().uuid(),
  source: z.enum(["web", "pwa"]),
  values: z.array(fieldValueSchema).min(1),
});

export type FieldIngestInput = z.infer<typeof fieldIngestSchema>;

export type FieldIngestResult = {
  status: 200 | 201;
  deduped: boolean;
  entry_id: string;
  signals: unknown[];
};

export function isDuplicateKeyError(message?: string): boolean {
  if (!message) return false;
  return message.toLowerCase().includes("duplicate key");
}

function valueObservedAt(value: FieldIngestInput["values"][number]): string {
  return value.observed_at ?? new Date().toISOString();
}

export async function ingestFieldEntry(
  user: User,
  input: FieldIngestInput,
): Promise<FieldIngestResult> {
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", input.project_id)
    .single();

  if (!project) {
    throw new Error("Project not found");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("org_id", project.org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    throw new Error("Forbidden");
  }

  const { data: lockedToc } = await supabase
    .from("theories_of_change")
    .select("id")
    .eq("project_id", input.project_id)
    .eq("status", "locked")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lockedToc) {
    throw new Error("Lock a Theory of Change before recording field data.");
  }

  const { data: assumptions } = await supabase
    .from("toc_assumptions")
    .select("id, indicator")
    .eq("toc_id", lockedToc.id);

  const assumptionByIndicator = new Map(
    (assumptions ?? []).map((a) => [a.indicator, a.id]),
  );

  const payload = {
    values: input.values.map((value) => ({
      indicator: value.indicator,
      value: value.value,
      observed_at: valueObservedAt(value),
    })),
  };

  const recordedAt = payload.values[0]?.observed_at ?? new Date().toISOString();

  const { data: insertedEntry, error: entryError } = await supabase
    .from("field_entries")
    .insert({
      project_id: input.project_id,
      source: input.source,
      payload,
      client_uuid: input.client_uuid,
      recorded_at: recordedAt,
    })
    .select("id")
    .single();

  if (entryError && !isDuplicateKeyError(entryError.message)) {
    throw new Error(entryError.message ?? "Failed to record entry");
  }

  if (entryError && isDuplicateKeyError(entryError.message)) {
    const { data: existing } = await supabase
      .from("field_entries")
      .select("id")
      .eq("client_uuid", input.client_uuid)
      .maybeSingle();

    return {
      status: 200,
      deduped: true,
      entry_id: existing?.id ?? input.client_uuid,
      signals: [],
    };
  }

  const entryId = insertedEntry?.id;
  if (!entryId) {
    throw new Error("Failed to record entry");
  }

  for (const value of payload.values) {
    const assumptionId = assumptionByIndicator.get(value.indicator) ?? null;
    const { error: pointError } = await supabase.from("indicator_points").insert({
      project_id: input.project_id,
      assumption_id: assumptionId,
      indicator: value.indicator,
      value: value.value,
      observed_at: value.observed_at,
    });

    if (pointError && !isDuplicateKeyError(pointError.message)) {
      throw new Error(pointError.message ?? "Failed to record indicator");
    }
  }

  let signals: unknown[] = [];
  try {
    const upstream = await fetch(`${getAiServiceUrl()}/mande/evaluate`, {
      method: "POST",
      headers: aiServiceJsonHeaders(),
      body: JSON.stringify({ project_id: input.project_id }),
    });
    if (upstream.ok) {
      const evaluated = await upstream.json();
      signals = evaluated.signals ?? [];
    }
  } catch {
    // Optional in local dev. Ingest should still succeed.
  }

  return {
    status: 201,
    deduped: false,
    entry_id: entryId,
    signals,
  };
}
