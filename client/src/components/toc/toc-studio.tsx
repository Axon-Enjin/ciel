"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type FailurePrompt = {
  id?: string;
  prompt: string;
  source_ids: string[];
  acknowledged?: boolean;
};

type StreamOutcome = {
  path: string;
  text: string;
  source_ids: string[];
};

const NODE_LABELS: Record<string, string> = {
  interrogate: "Root-cause interrogation",
  retrieve: "Evidence retrieval",
  draft: "Drafting ToC",
  critique: "Intelligent failure critique",
};

export function TocStudio({
  projectId,
  orgId,
  need,
  autoGenerate,
}: {
  projectId: string;
  orgId: string;
  need: string;
  autoGenerate?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "generating" | "ready" | "locking" | "locked" | "error">(
    autoGenerate ? "generating" : "idle",
  );
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<StreamOutcome[]>([]);
  const [prompts, setPrompts] = useState<FailurePrompt[]>([]);
  const [tocId, setTocId] = useState<string | null>(null);
  const [critiqueIds, setCritiqueIds] = useState<string[]>([]);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  const runGeneration = useCallback(async () => {
    setPhase("generating");
    setError(null);
    setOutcomes([]);
    setPrompts([]);
    setActiveNode(null);

    try {
      const res = await fetch("/api/toc/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          org_id: orgId,
          need,
          context: {},
        }),
      });

      if (!res.ok || !res.body) {
        const detail = await res.text();
        throw new Error(detail || "Generation failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) data = line.slice(5).trim();
          }
          if (!data) continue;

          const payload = JSON.parse(data);

          if (event === "node_started") {
            setActiveNode(payload.node);
          }
          if (event === "toc_delta") {
            setOutcomes((prev) => {
              const idx = prev.findIndex((o) => o.path === payload.path);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = payload;
                return next;
              }
              return [...prev, payload];
            });
          }
          if (event === "failure_prompt") {
            setPrompts((prev) => [...prev, payload]);
          }
          if (event === "run_finished") {
            setTocId(payload.toc_id);
            setCritiqueIds(payload.critique_ids ?? []);
            setPhase("ready");
          }
          if (event === "error") {
            throw new Error(payload.message ?? "Stream error");
          }
        }
      }

      if (phase === "generating") {
        setPhase("ready");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setPhase("error");
    }
  }, [projectId, orgId, need, phase]);

  useEffect(() => {
    if (autoGenerate) {
      runGeneration();
    }
  }, [autoGenerate, runGeneration]);

  const toggleAck = (id: string) => {
    setAcknowledged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLock = async () => {
    if (!tocId) return;
    setLockError(null);
    setPhase("locking");

    const idsToAck =
      critiqueIds.length > 0
        ? critiqueIds
        : prompts.map((_, i) => `placeholder-${i}`);

    const ackList =
      acknowledged.size > 0 ? Array.from(acknowledged) : idsToAck;

    try {
      const res = await fetch(`/api/toc/${tocId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged_critique_ids: ackList }),
      });

      const data = await res.json();
      if (res.status === 409) {
        setLockError(data.detail ?? "Acknowledge all failure prompts before locking.");
        setPhase("ready");
        return;
      }
      if (!res.ok) {
        setLockError(data.detail ?? data.error ?? "Lock failed");
        setPhase("ready");
        return;
      }

      setPhase("locked");
    } catch {
      setLockError("Network error while locking.");
      setPhase("ready");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
            ToC Studio
          </p>
          <h1 className="mt-1 text-display text-2xl text-[var(--color-text)]">
            Theory of Change
          </h1>
        </div>
        <div className="flex gap-2">
          {phase !== "generating" && phase !== "locked" && (
            <button
              type="button"
              onClick={runGeneration}
              className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium hover:border-[var(--color-primary)]"
            >
              {phase === "idle" ? "Generate ToC" : "Regenerate"}
            </button>
          )}
          {phase === "ready" && tocId && (
            <button
              type="button"
              onClick={handleLock}
              disabled={prompts.length > 0 && acknowledged.size < critiqueIds.length}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Lock ToC
            </button>
          )}
        </div>
      </div>

      {phase === "generating" && (
        <div className="rounded-[var(--radius-surface)] border border-[var(--color-border)] bg-white p-6">
          <p className="text-sm font-medium text-[var(--color-text)]">Generating…</p>
          <ul className="mt-4 space-y-2">
            {Object.entries(NODE_LABELS).map(([key, label]) => (
              <li
                key={key}
                className={`flex items-center gap-2 text-sm ${
                  activeNode === key
                    ? "text-[var(--color-primary)] font-medium"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    activeNode === key ? "bg-[var(--color-accent)] animate-pulse" : "bg-[var(--color-border)]"
                  }`}
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}
      {lockError && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{lockError}</div>
      )}

      {outcomes.length > 0 && (
        <section className="rounded-[var(--radius-surface)] border border-[var(--color-border)] bg-white p-6">
          <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">
            Outcomes (streamed)
          </h2>
          <ul className="mt-4 space-y-4">
            {outcomes.map((o) => (
              <li key={o.path} className="border-l-2 border-[var(--color-primary)] pl-4">
                <p className="text-[var(--color-text)]">{o.text}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {o.source_ids.length > 0 ? (
                    o.source_ids.map((sid) => (
                      <span
                        key={sid}
                        className="rounded-full bg-[var(--color-bg)] px-2 py-0.5 text-xs font-mono text-[var(--color-data)]"
                      >
                        source:{sid.slice(0, 8)}…
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                      unverified — needs human input
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {prompts.length > 0 && phase !== "locked" && (
        <section className="rounded-[var(--radius-surface)] border border-[var(--color-warning)]/40 bg-amber-50/50 p-6">
          <h2 className="font-display text-lg font-semibold text-[var(--color-text)]">
            Intelligent failure prompts
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Acknowledge each prompt before you can lock this ToC.
          </p>
          <ul className="mt-4 space-y-4">
            {prompts.map((p, i) => {
              const id = critiqueIds[i] ?? `idx-${i}`;
              return (
                <li
                  key={id}
                  className="rounded-lg border border-[var(--color-border)] bg-white p-4"
                >
                  <p className="text-sm text-[var(--color-text)]">{p.prompt}</p>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={acknowledged.has(id)}
                      onChange={() => toggleAck(id)}
                      className="rounded border-[var(--color-border)]"
                    />
                    I understand this risk
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {phase === "locked" && (
        <div className="rounded-[var(--radius-surface)] border border-[var(--color-success)]/30 bg-green-50 p-6">
          <p className="font-medium text-[var(--color-success)]">ToC locked</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Assumptions extracted for M&amp;E monitoring. You can proceed to grant drafting or field capture.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Back to dashboard →
          </Link>
        </div>
      )}

      <details className="rounded-lg border border-[var(--color-border)] bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium text-[var(--color-text-muted)]">
          Need statement
        </summary>
        <p className="mt-2 text-[var(--color-text)]">{need}</p>
      </details>
    </div>
  );
}
