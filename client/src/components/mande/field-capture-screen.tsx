"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import {
  cacheProjectContext,
  enqueueEntry,
  listOutbox,
  type OutboxEntry,
} from "@/lib/field-outbox";
import { flushOutbox, registerBackgroundSync } from "@/lib/field-sync";

type CaptureAssumption = {
  id: string;
  statement: string;
  indicator: string;
  threshold: number | null;
};

export function FieldCaptureScreen({
  projectId,
  projectNeed,
  assumptions,
  initialOutbox = [],
}: {
  projectId: string;
  projectNeed: string;
  assumptions: CaptureAssumption[];
  initialOutbox?: OutboxEntry[];
}) {
  const [indicator, setIndicator] = React.useState(
    assumptions[0]?.indicator ?? "",
  );
  const [value, setValue] = React.useState("");
  const [outbox, setOutbox] = React.useState<OutboxEntry[]>(initialOutbox);
  const [online, setOnline] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refreshOutbox = React.useCallback(async () => {
    const rows = await listOutbox(projectId);
    setOutbox(rows.slice(-8).reverse());
  }, [projectId]);

  React.useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    void refreshOutbox();
    void cacheProjectContext({
      project_id: projectId,
      need: projectNeed,
      assumptions,
    });
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [assumptions, projectId, projectNeed, refreshOutbox]);

  const submitOnline = React.useCallback(
    async (entry: {
      client_uuid: string;
      project_id: string;
      indicator: string;
      value: number;
      observed_at: string;
    }) => {
      const response = await fetch("/api/field/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not submit field entry");
      }
      const data = await response.json().catch(() => ({}));
      return Boolean(data.deduped);
    },
    [],
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!indicator || !value) {
      setError("Indicator and value are required.");
      return;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      setError("Value must be numeric.");
      return;
    }

    const entry = {
      client_uuid: crypto.randomUUID(),
      project_id: projectId,
      indicator,
      value: numeric,
      observed_at: new Date().toISOString(),
    };

    if (online) {
      try {
        const deduped = await submitOnline(entry);
        setMessage(
          deduped
            ? "Already synced — duplicate replay safely ignored."
            : "Recorded and synced.",
        );
        setValue("");
        await refreshOutbox();
        return;
      } catch {
        // Fall through to queue.
      }
    }

    await enqueueEntry(entry);
    await registerBackgroundSync().catch(() => undefined);
    await refreshOutbox();
    setMessage("Queued offline. It will sync once you reconnect.");
    setValue("");
  };

  const onSyncNow = async () => {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await flushOutbox(projectId);
      if (result.failed > 0) {
        setError(`Synced ${result.synced}, ${result.failed} still pending.`);
      } else {
        setMessage(
          result.synced > 0
            ? `Synced ${result.synced} queued entr${result.synced === 1 ? "y" : "ies"}.`
            : "Nothing pending to sync.",
        );
      }
    } finally {
      setSyncing(false);
      await refreshOutbox();
    }
  };

  if (assumptions.length === 0) {
    return (
      <Surface className="p-6" elevation="sm">
        <p className="text-sm text-[var(--color-text-muted)]">
          This project has no locked assumptions to monitor yet.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href={`/projects/${projectId}/toc`}>Go to ToC Studio</Link>
          </Button>
        </div>
      </Surface>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <Surface className="p-5" elevation="sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Field capture
          </p>
          <span
            className="inline-flex min-h-[28px] items-center rounded-full px-3 text-[11px] font-semibold"
            style={{
              backgroundColor: online
                ? "color-mix(in srgb, var(--color-success) 16%, transparent)"
                : "color-mix(in srgb, var(--color-warning) 18%, transparent)",
              color: online ? "var(--color-success)" : "var(--color-warning)",
            }}
          >
            {online ? "Online" : "Offline"}
          </span>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
          Record an indicator now. Offline entries stay queued and sync safely
          once connected.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="capture-indicator"
              className="block text-sm font-medium text-[var(--color-text)]"
            >
              Indicator
            </label>
            <select
              id="capture-indicator"
              value={indicator}
              onChange={(e) => setIndicator(e.target.value)}
              className="mt-1 block w-full min-h-[44px] rounded-control border border-[var(--color-border)] bg-surface px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              {assumptions.map((assumption) => (
                <option key={assumption.id} value={assumption.indicator}>
                  {assumption.indicator.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="capture-value"
              className="block text-sm font-medium text-[var(--color-text)]"
            >
              Value
            </label>
            <input
              id="capture-value"
              type="number"
              inputMode="decimal"
              step="any"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 block w-full min-h-[44px] rounded-control border border-[var(--color-border)] bg-surface px-3 py-2 font-mono text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {online ? "Record now" : "Queue offline"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onSyncNow}
              disabled={syncing}
            >
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        </form>

        {message ? (
          <p className="mt-3 text-sm text-[var(--color-success)]">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-[var(--color-error)]">{error}</p>
        ) : null}
      </Surface>

      <Surface className="p-5" elevation="sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Outbox
        </p>
        {outbox.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            No captured entries yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {outbox.map((entry) => (
              <li
                key={entry.client_uuid}
                className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {entry.indicator.replace(/_/g, " ")}: {entry.value}
                  </p>
                  <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {entry.status === "queued"
                      ? "queued (offline)"
                      : entry.status === "syncing"
                        ? "syncing"
                        : entry.status === "synced"
                          ? "synced"
                          : "error"}
                  </span>
                </div>
                {entry.error_message ? (
                  <p className="mt-1 text-[11px] text-[var(--color-error)]">
                    {entry.error_message}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}
