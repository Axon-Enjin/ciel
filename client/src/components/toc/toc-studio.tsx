"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { TocGraphCanvas } from "./toc-graph-canvas";
import { TocNodeDetailPanel } from "./toc-node-detail-panel";
import type {
  FailurePrompt,
  TocAssumption,
  TocGraph,
  TocNode,
} from "./types";

const NODE_LABELS: Record<string, string> = {
  interrogate: "Root-cause interrogation",
  retrieve: "Evidence retrieval",
  draft: "Drafting ToC",
  critique: "Intelligent failure critique",
};

function mergeDelta(graph: TocGraph, delta: TocNode & { path: string }): TocGraph {
  const idx = graph.nodes.findIndex((n) => n.id === delta.id);
  const node: TocNode = {
    id: delta.id,
    type: delta.type,
    text: delta.text,
    source_ids: delta.source_ids ?? [],
  };
  const nodes =
    idx >= 0
      ? graph.nodes.map((n, i) => (i === idx ? node : n))
      : [...graph.nodes, node];
  return { ...graph, nodes };
}

export type TocStudioProps = {
  projectId: string;
  orgId: string;
  need: string;
  context?: Record<string, string>;
  autoGenerate?: boolean;
  initialGraph?: TocGraph | null;
  initialCritiques?: FailurePrompt[];
  initialStatus?: "draft" | "locked" | null;
  initialTocId?: string | null;
};

export function TocStudio({
  projectId,
  orgId,
  need,
  context = {},
  autoGenerate,
  initialGraph,
  initialCritiques = [],
  initialStatus,
  initialTocId,
}: TocStudioProps) {
  const isLocked = initialStatus === "locked";
  const hasDraft = Boolean(initialGraph?.nodes.length) && !isLocked;

  const [phase, setPhase] = useState<
    "idle" | "generating" | "ready" | "locking" | "locked" | "error"
  >(() => {
    if (isLocked) return "locked";
    if (hasDraft) return "ready";
    return autoGenerate ? "generating" : "idle";
  });

  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [graph, setGraph] = useState<TocGraph>(
    initialGraph ?? { nodes: [], edges: [] },
  );
  const [questions, setQuestions] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<FailurePrompt[]>(initialCritiques);
  const [tocId, setTocId] = useState<string | null>(initialTocId ?? null);
  const [critiqueIds, setCritiqueIds] = useState<string[]>(
    initialCritiques.map((c, i) => c.id ?? `idx-${i}`),
  );
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [assumptions, setAssumptions] = useState<TocAssumption[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  const runGeneration = useCallback(async () => {
    setPhase("generating");
    setError(null);
    setGraph({ nodes: [], edges: [] });
    setQuestions([]);
    setPrompts([]);
    setActiveNode(null);
    setAcknowledged(new Set());
    setAssumptions([]);

    try {
      const res = await fetch("/api/toc/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          org_id: orgId,
          need,
          context,
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
          if (event === "interrogation_question") {
            setQuestions((prev) => {
              const next = [...prev];
              next[payload.index] = payload.text;
              return next;
            });
          }
          if (event === "toc_delta") {
            setGraph((prev) =>
              mergeDelta(prev, {
                path: payload.path,
                id: payload.id,
                type: payload.type,
                text: payload.text,
                source_ids: payload.source_ids ?? [],
              }),
            );
          }
          if (event === "graph_complete") {
            setGraph({
              nodes: payload.nodes ?? [],
              edges: payload.edges ?? [],
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

      setPhase((p) => (p === "generating" ? "ready" : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setPhase("error");
    }
  }, [projectId, orgId, need, context]);

  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (autoGenerate && !hasAutoStarted.current && !hasDraft && !isLocked) {
      hasAutoStarted.current = true;
      runGeneration();
    }
  }, [autoGenerate, hasDraft, isLocked, runGeneration]);

  const toggleAck = (id: string) => {
    setAcknowledged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allAcknowledged =
    critiqueIds.length > 0 &&
    critiqueIds.every((id) => acknowledged.has(id));

  const handleLock = async () => {
    if (!tocId || !allAcknowledged) return;
    setLockError(null);
    setPhase("locking");

    try {
      const res = await fetch(`/api/toc/${tocId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acknowledged_critique_ids: Array.from(acknowledged),
        }),
      });

      const data = await res.json();
      if (res.status === 409) {
        setLockError(
          data.detail ??
            "Acknowledge all failure prompts before locking.",
        );
        setPhase("ready");
        return;
      }
      if (!res.ok) {
        setLockError(data.detail ?? data.error ?? "Lock failed");
        setPhase("ready");
        return;
      }

      setAssumptions(data.assumptions ?? []);
      setPhase("locked");
    } catch {
      setLockError("Network error while locking.");
      setPhase("ready");
    }
  };

  const showGeneratingPanel = phase === "generating";
  const readOnlyGraph = phase === "locked" || isLocked;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
            ToC Studio
          </p>
          <h1 className="mt-2 font-display text-[32px] font-semibold leading-tight text-[var(--color-text)]">
            Theory of Change
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnlyGraph &&
            phase !== "generating" &&
            phase !== "locking" && (
              <Button
                type="button"
                variant="secondary"
                onClick={runGeneration}
              >
                {phase === "idle" ? "Generate ToC" : "Regenerate"}
              </Button>
            )}
          {phase === "ready" && tocId && (
            <Button
              type="button"
              onClick={handleLock}
              disabled={!allAcknowledged}
            >
              Lock ToC
            </Button>
          )}
        </div>
      </header>

      {showGeneratingPanel && (
        <Surface className="p-6" elevation="sm">
          <p className="text-sm font-medium text-[var(--color-text)]">
            Generating…
          </p>
          <ul className="mt-4 space-y-2" aria-live="polite">
            {Object.entries(NODE_LABELS).map(([key, label]) => (
              <li
                key={key}
                className={`flex items-center gap-2 text-sm ${
                  activeNode === key
                    ? "font-medium text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)]"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    activeNode === key
                      ? "bg-[var(--color-accent)]"
                      : "bg-[var(--color-border)]"
                  }`}
                />
                {label}
              </li>
            ))}
          </ul>
        </Surface>
      )}

      {error && (
        <Surface
          className="border-[color-mix(in_srgb,var(--color-error)_35%,var(--color-border))] p-4"
          elevation="none"
        >
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </Surface>
      )}
      {lockError && (
        <Surface
          className="border-[color-mix(in_srgb,var(--color-warning)_40%,var(--color-border))] p-4"
          elevation="none"
        >
          <p className="text-sm text-[var(--color-text)]">{lockError}</p>
        </Surface>
      )}

      {questions.length > 0 && (
        <Surface as="section" className="p-6" elevation="sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
            Root-cause questions
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Worth reflecting on before you commit — no need to answer here.
          </p>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-[var(--color-text)]">
            {questions.filter(Boolean).map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </Surface>
      )}

      <section aria-labelledby="toc-graph-heading">
        <h2 id="toc-graph-heading" className="sr-only">
          Theory of Change graph
        </h2>
        {graph.nodes.length > 0 && !selectedNodeId && (
          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
            Select a node to read its full statement.
          </p>
        )}
        <TocGraphCanvas
          graph={graph}
          streaming={phase === "generating"}
          readOnly={readOnlyGraph}
          selectedId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
        <TocNodeDetailPanel
          node={
            selectedNodeId
              ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null
              : null
          }
          onClose={() => setSelectedNodeId(null)}
        />
      </section>

      {prompts.length > 0 && phase !== "locked" && !isLocked && (
        <Surface
          as="section"
          className="border-[color-mix(in_srgb,var(--color-warning)_40%,transparent)] p-6"
          elevation="sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
            Intelligent failure prompts
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Here&apos;s what didn&apos;t work last time — worth a look before
            you commit.
          </p>
          <fieldset className="mt-4 space-y-4">
            <legend className="sr-only">
              Acknowledge failure prompts before locking
            </legend>
            {prompts.map((p, i) => {
              const id = critiqueIds[i] ?? p.id ?? `idx-${i}`;
              const inputId = `critique-ack-${id}`;
              return (
                <Surface key={id} className="p-4" elevation="none">
                  <p className="text-sm text-[var(--color-text)]">
                    {p.prompt}
                  </p>
                  <label
                    htmlFor={inputId}
                    className="mt-3 flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-[var(--color-text)]"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={acknowledged.has(id)}
                      onChange={() => toggleAck(id)}
                      className="h-4 w-4 rounded border-[var(--color-border)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    />
                    I understand this risk
                  </label>
                </Surface>
              );
            })}
          </fieldset>
        </Surface>
      )}

      {(phase === "locked" || isLocked) && (
        <Surface
          className="border-[color-mix(in_srgb,var(--color-success)_30%,var(--color-border))] p-6"
          elevation="sm"
        >
          <p className="font-semibold text-[var(--color-success)]">
            ToC locked
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Assumptions extracted for M&amp;E monitoring. You can proceed to
            grant drafting or return to the dashboard.
          </p>
          {assumptions.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
              {assumptions.map((a, i) => (
                <li
                  key={a.id ?? i}
                  className="text-sm text-[var(--color-text)]"
                >
                  <span className="font-medium">{a.statement}</span>
                  {a.indicator && (
                    <span className="ml-2 text-[var(--color-text-muted)]">
                      ({a.indicator}
                      {a.threshold != null ? ` ≥ ${a.threshold}` : ""})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href={`/projects/${projectId}/grants`}>
                Draft a grant proposal
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/projects/${projectId}`}>
                View project dashboard
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </Surface>
      )}

      <details className="rounded-surface border border-[var(--color-border)] bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-medium text-[var(--color-text-muted)]">
          Need statement
        </summary>
        <p className="mt-2 text-[var(--color-text)]">{need}</p>
        {(context.region || context.population) && (
          <dl className="mt-3 grid gap-2 text-[var(--color-text-muted)] sm:grid-cols-2">
            {context.region && (
              <>
                <dt className="text-xs uppercase tracking-wide">Region</dt>
                <dd className="text-[var(--color-text)]">{context.region}</dd>
              </>
            )}
            {context.population && (
              <>
                <dt className="text-xs uppercase tracking-wide">Population</dt>
                <dd className="text-[var(--color-text)]">
                  {context.population}
                </dd>
              </>
            )}
          </dl>
        )}
      </details>
    </div>
  );
}
