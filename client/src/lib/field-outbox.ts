import { openDB } from "idb";

export type OutboxStatus = "queued" | "syncing" | "synced" | "error";

export type OutboxEntry = {
  client_uuid: string;
  project_id: string;
  indicator: string;
  value: number;
  observed_at: string;
  status: OutboxStatus;
  created_at: string;
  error_message?: string;
};

export type ProjectCaptureContext = {
  project_id: string;
  need: string;
  assumptions: Array<{
    id: string;
    statement: string;
    indicator: string;
    threshold: number | null;
  }>;
  cached_at: string;
};

const DB_NAME = "ciel-field-capture";
const DB_VERSION = 1;
const OUTBOX_STORE = "field_outbox";
const CONTEXT_STORE = "field_context";

const memoryOutbox = new Map<string, OutboxEntry>();
const memoryContext = new Map<string, ProjectCaptureContext>();

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = db.createObjectStore(OUTBOX_STORE, {
          keyPath: "client_uuid",
        });
        outbox.createIndex("project_id", "project_id");
        outbox.createIndex("status", "status");
      }
      if (!db.objectStoreNames.contains(CONTEXT_STORE)) {
        db.createObjectStore(CONTEXT_STORE, { keyPath: "project_id" });
      }
    },
  });
}

function sortByCreatedAt<T extends { created_at: string }>(items: T[]): T[] {
  return items.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function enqueueEntry(
  entry: Omit<OutboxEntry, "status" | "created_at">,
): Promise<OutboxEntry> {
  const row: OutboxEntry = {
    ...entry,
    status: "queued",
    created_at: new Date().toISOString(),
  };

  if (!hasIndexedDb()) {
    memoryOutbox.set(row.client_uuid, row);
    return row;
  }

  const db = await getDb();
  await db.put(OUTBOX_STORE, row);
  return row;
}

export async function listOutbox(projectId?: string): Promise<OutboxEntry[]> {
  if (!hasIndexedDb()) {
    const rows = Array.from(memoryOutbox.values());
    const filtered = projectId ? rows.filter((r) => r.project_id === projectId) : rows;
    return sortByCreatedAt(filtered);
  }

  const db = await getDb();
  const rows = (await db.getAll(OUTBOX_STORE)) as OutboxEntry[];
  const filtered = projectId ? rows.filter((r) => r.project_id === projectId) : rows;
  return sortByCreatedAt(filtered);
}

export async function listPending(projectId?: string): Promise<OutboxEntry[]> {
  const rows = await listOutbox(projectId);
  return rows.filter((r) => r.status === "queued" || r.status === "error");
}

async function patchStatus(
  clientUuid: string,
  status: OutboxStatus,
  errorMessage?: string,
): Promise<void> {
  if (!hasIndexedDb()) {
    const entry = memoryOutbox.get(clientUuid);
    if (!entry) return;
    memoryOutbox.set(clientUuid, {
      ...entry,
      status,
      error_message: errorMessage,
    });
    return;
  }

  const db = await getDb();
  const entry = (await db.get(OUTBOX_STORE, clientUuid)) as OutboxEntry | undefined;
  if (!entry) return;
  await db.put(OUTBOX_STORE, {
    ...entry,
    status,
    error_message: errorMessage,
  });
}

export async function markSyncing(clientUuid: string): Promise<void> {
  await patchStatus(clientUuid, "syncing");
}

export async function markSynced(clientUuid: string): Promise<void> {
  await patchStatus(clientUuid, "synced");
}

export async function markError(
  clientUuid: string,
  message: string,
): Promise<void> {
  await patchStatus(clientUuid, "error", message);
}

export async function cacheProjectContext(
  context: Omit<ProjectCaptureContext, "cached_at">,
): Promise<void> {
  const payload: ProjectCaptureContext = {
    ...context,
    cached_at: new Date().toISOString(),
  };

  if (!hasIndexedDb()) {
    memoryContext.set(payload.project_id, payload);
    return;
  }

  const db = await getDb();
  await db.put(CONTEXT_STORE, payload);
}

export async function getCachedProjectContext(
  projectId: string,
): Promise<ProjectCaptureContext | null> {
  if (!hasIndexedDb()) {
    return memoryContext.get(projectId) ?? null;
  }

  const db = await getDb();
  return ((await db.get(CONTEXT_STORE, projectId)) as ProjectCaptureContext | undefined) ?? null;
}

export async function resetOutboxForTests(): Promise<void> {
  memoryOutbox.clear();
  memoryContext.clear();
}
