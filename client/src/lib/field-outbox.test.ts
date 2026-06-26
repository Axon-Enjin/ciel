import { describe, expect, it } from "vitest";
import {
  cacheProjectContext,
  enqueueEntry,
  getCachedProjectContext,
  listPending,
  listOutbox,
  markError,
  markSyncing,
  markSynced,
  resetOutboxForTests,
} from "@/lib/field-outbox";

describe("field outbox", () => {
  it("queues and transitions statuses in memory fallback", async () => {
    await resetOutboxForTests();
    const row = await enqueueEntry({
      client_uuid: "a6b8a220-bf48-49aa-ac7f-a8532df2a768",
      project_id: "p1",
      indicator: "attendance_per_session",
      value: 9.2,
      observed_at: "2026-06-26T00:00:00.000Z",
    });

    expect(row.status).toBe("queued");
    expect((await listPending("p1")).length).toBe(1);

    await markSyncing(row.client_uuid);
    expect((await listOutbox("p1"))[0]?.status).toBe("syncing");

    await markError(row.client_uuid, "temporary network issue");
    expect((await listOutbox("p1"))[0]?.status).toBe("error");

    await markSynced(row.client_uuid);
    expect((await listOutbox("p1"))[0]?.status).toBe("synced");
  });

  it("stores and returns cached project context", async () => {
    await resetOutboxForTests();
    await cacheProjectContext({
      project_id: "proj-1",
      need: "Youth employment support",
      assumptions: [
        {
          id: "a1",
          statement: "Outcome holds",
          indicator: "employment_rate_6mo",
          threshold: 60,
        },
      ],
    });

    const cached = await getCachedProjectContext("proj-1");
    expect(cached?.project_id).toBe("proj-1");
    expect(cached?.assumptions[0]?.indicator).toBe("employment_rate_6mo");
  });
});
