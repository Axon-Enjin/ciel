import { describe, expect, it } from "vitest";
import {
  fieldIngestSchema,
  isDuplicateKeyError,
} from "@/lib/field-ingest";

describe("field ingest validation", () => {
  it("accepts RFC payload shape for /api/field/entry", () => {
    const parsed = fieldIngestSchema.safeParse({
      client_uuid: "f43ab84f-2514-4199-bcf6-cc2fdd6f9991",
      project_id: "e4f15763-66e6-4f8b-9b64-f2e7ef67d5e0",
      source: "pwa",
      values: [
        {
          indicator: "employment_rate_6mo",
          value: 42,
          observed_at: "2026-06-26T00:00:00.000Z",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("detects duplicate-key idempotency errors", () => {
    expect(
      isDuplicateKeyError('duplicate key value violates unique constraint "field_entries_client_uuid_key"'),
    ).toBe(true);
    expect(isDuplicateKeyError("connection timeout")).toBe(false);
  });
});
