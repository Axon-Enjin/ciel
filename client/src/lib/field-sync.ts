import {
  listPending,
  markError,
  markSynced,
  markSyncing,
  type OutboxEntry,
} from "@/lib/field-outbox";

export async function flushOutbox(projectId?: string): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = await listPending(projectId);
  let synced = 0;
  let failed = 0;

  for (const entry of pending) {
    await markSyncing(entry.client_uuid);
    try {
      const response = await postOutboxEntry(entry);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Sync failed (${response.status})`);
      }
      await markSynced(entry.client_uuid);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      await markError(entry.client_uuid, message);
      failed += 1;
    }
  }

  return { synced, failed };
}

async function postOutboxEntry(entry: OutboxEntry): Promise<Response> {
  const payload = {
    client_uuid: entry.client_uuid,
    project_id: entry.project_id,
    source: "pwa",
    values: [
      {
        indicator: entry.indicator,
        value: entry.value,
        observed_at: entry.observed_at,
      },
    ],
  };

  return fetch("/api/field/entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
}

export async function registerBackgroundSync(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.ready;
  if (!("sync" in registration)) return false;

  const syncManager = (
    registration as ServiceWorkerRegistration & {
      sync: { register: (tag: string) => Promise<void> };
    }
  ).sync;
  await syncManager.register("ciel-field-outbox");
  return true;
}
