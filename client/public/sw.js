self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ciel-field-capture", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("field_outbox")) {
        db.createObjectStore("field_outbox", { keyPath: "client_uuid" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readPendingEntries() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("field_outbox", "readonly");
    const store = tx.objectStore("field_outbox");
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = (req.result || []).filter(
        (row) => row.status === "queued" || row.status === "error",
      );
      resolve(rows);
    };
    req.onerror = () => reject(req.error);
  });
}

async function setStatus(clientUuid, status, errorMessage) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("field_outbox", "readwrite");
    const store = tx.objectStore("field_outbox");
    const getReq = store.get(clientUuid);
    getReq.onsuccess = () => {
      const current = getReq.result;
      if (!current) {
        resolve();
        return;
      }
      current.status = status;
      current.error_message = errorMessage;
      store.put(current);
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function syncOutbox() {
  const pending = await readPendingEntries();
  for (const entry of pending) {
    await setStatus(entry.client_uuid, "syncing");
    try {
      const res = await fetch("/api/field/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
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
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Sync failed (${res.status})`);
      }
      await setStatus(entry.client_uuid, "synced");
    } catch (error) {
      await setStatus(
        entry.client_uuid,
        "error",
        error instanceof Error ? error.message : "Sync failed",
      );
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "ciel-field-outbox") {
    event.waitUntil(syncOutbox());
  }
});
