"use client";

import * as React from "react";
import { Surface } from "@/components/ui/surface";
import {
  computeGraphLayout,
  edgePath,
  positionMap,
  validateEdges,
} from "./toc-graph-layout";
import { TocProvenanceChip } from "./toc-provenance-chip";
import {
  NODE_TYPE_LABELS,
  NODE_TYPE_ORDER,
  type TocGraph,
  type TocNode,
} from "./types";

export type TocGraphCanvasProps = {
  graph: TocGraph;
  streaming?: boolean;
  readOnly?: boolean;
  selectedId?: string | null;
  onSelectNode?: (id: string | null) => void;
};

export function TocGraphCanvas({
  graph,
  streaming = false,
  readOnly = false,
  selectedId = null,
  onSelectNode,
}: TocGraphCanvasProps) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const nodeRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const layout = React.useMemo(() => computeGraphLayout(graph), [graph]);
  const positions = React.useMemo(() => positionMap(layout), [layout]);
  const nodeById = React.useMemo(
    () => new Map(graph.nodes.map((n) => [n.id, n])),
    [graph.nodes],
  );
  const { valid: edges } = React.useMemo(
    () => validateEdges(graph.nodes, graph.edges),
    [graph.nodes, graph.edges],
  );

  const focusId = selectedId ?? hoveredId;
  const connectedIds = React.useMemo(() => {
    if (!focusId) return new Set<string>();
    const set = new Set<string>([focusId]);
    for (const e of edges) {
      if (e.from_node === focusId) set.add(e.to_node);
      if (e.to_node === focusId) set.add(e.from_node);
    }
    return set;
  }, [focusId, edges]);

  const orderedNodeIds = React.useMemo(() => {
    const groups = NODE_TYPE_ORDER.flatMap((type) =>
      graph.nodes.filter((n) => n.type === type).map((n) => n.id),
    );
    return groups;
  }, [graph.nodes]);

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nodeId: string,
  ) => {
    const idx = orderedNodeIds.indexOf(nodeId);
    if (idx < 0) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = orderedNodeIds[Math.min(idx + 1, orderedNodeIds.length - 1)];
      onSelectNode?.(next);
      nodeRefs.current.get(next)?.focus();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = orderedNodeIds[Math.max(idx - 1, 0)];
      onSelectNode?.(prev);
      nodeRefs.current.get(prev)?.focus();
    }
    if (e.key === "Escape") {
      onSelectNode?.(null);
    }
  };

  const summary =
    graph.nodes.length === 0
      ? "Theory of Change graph — empty"
      : `Theory of Change with ${graph.nodes.length} nodes across ${NODE_TYPE_ORDER.filter((t) => graph.nodes.some((n) => n.type === t)).length} stages`;

  if (graph.nodes.length === 0 && streaming) {
    return (
      <Surface className="relative overflow-hidden p-6" elevation="sm">
        {streaming && !reducedMotion && (
          <div
            className="absolute inset-x-0 top-0 h-0.5 overflow-hidden"
            aria-hidden
          >
            <div className="h-full w-1/3 bg-[var(--color-accent)] toc-stream-bar" />
          </div>
        )}
        <p className="text-sm text-[var(--color-text-muted)]">
          Building your logic model…
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {NODE_TYPE_ORDER.map((type) => (
            <div
              key={type}
              className="h-24 rounded-surface border border-[var(--color-border)] bg-[var(--color-bg)] toc-shimmer-skeleton"
              style={reducedMotion ? { opacity: 0.7 } : undefined}
            />
          ))}
        </div>
      </Surface>
    );
  }

  if (graph.nodes.length === 0) {
    return (
      <Surface className="p-6" elevation="sm">
        <p className="text-sm text-[var(--color-text-muted)]">
          No Theory of Change yet. Generate one to see the full logic model.
        </p>
      </Surface>
    );
  }

  return (
    <Surface
      className={`relative overflow-x-auto p-4 ${readOnly ? "opacity-90" : ""}`}
      elevation="sm"
    >
      {readOnly && (
        <span className="absolute right-4 top-4 rounded-full bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          Locked
        </span>
      )}

      {streaming && !reducedMotion && (
        <div
          className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden"
          aria-hidden
        >
          <div className="h-full w-1/3 bg-[var(--color-accent)] toc-stream-bar" />
        </div>
      )}

      <div
        role="img"
        aria-label={summary}
        className="relative min-w-[960px]"
        style={{ width: layout.width, height: layout.height }}
      >
        <svg
          className="pointer-events-none absolute inset-0"
          width={layout.width}
          height={layout.height}
          aria-hidden
        >
          {edges.map((edge) => {
            const from = positions.get(edge.from_node);
            const to = positions.get(edge.to_node);
            if (!from || !to) return null;
            const active =
              focusId &&
              (edge.from_node === focusId ||
                edge.to_node === focusId ||
                connectedIds.has(edge.from_node));
            return (
              <path
                key={`${edge.from_node}-${edge.to_node}`}
                d={edgePath(from, to)}
                fill="none"
                stroke={
                  active ? "var(--color-data)" : "var(--color-border)"
                }
                strokeWidth={active ? 1.5 : 1}
              />
            );
          })}
        </svg>

        {layout.nodes.map((pos) => {
          const node = nodeById.get(pos.id);
          if (!node) return null;
          const isSelected = selectedId === node.id;
          const isConnected = connectedIds.has(node.id);
          const dimmed = focusId && !isConnected;

          return (
            <NodeCard
              key={node.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(node.id, el);
                else nodeRefs.current.delete(node.id);
              }}
              node={node}
              x={pos.x}
              y={pos.y}
              width={pos.width}
              height={pos.height}
              selected={isSelected}
              dimmed={!!dimmed}
              readOnly={readOnly}
              reducedMotion={reducedMotion}
              onSelect={() => onSelectNode?.(isSelected ? null : node.id)}
              onHover={(h) => setHoveredId(h ? node.id : null)}
              onKeyDown={(e) => handleKeyDown(e, node.id)}
            />
          );
        })}
      </div>
    </Surface>
  );
}

type NodeCardProps = {
  node: TocNode;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  dimmed: boolean;
  readOnly: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
};

const NodeCard = React.forwardRef<HTMLButtonElement, NodeCardProps>(
  function NodeCard(
    {
      node,
      x,
      y,
      width,
      height,
      selected,
      dimmed,
      readOnly,
      reducedMotion,
      onSelect,
      onHover,
      onKeyDown,
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        disabled={false}
        aria-disabled={readOnly || undefined}
        aria-selected={selected}
        aria-label={`${NODE_TYPE_LABELS[node.type]}: ${node.text}`}
        onClick={onSelect}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onKeyDown={onKeyDown}
        className={`absolute flex min-h-[44px] flex-col rounded-surface border bg-surface p-3 text-left transition-opacity duration-150 focus-visible:outline-none focus-visible:[outline:2px_solid_var(--color-primary)] focus-visible:[outline-offset:2px]${readOnly ? " cursor-default" : ""}${!reducedMotion && !readOnly ? " toc-node-in" : ""}`}
        style={{
          left: x,
          top: y,
          width,
          minHeight: height,
          borderColor: selected
            ? "var(--color-primary)"
            : "var(--color-border)",
          outline: selected ? "2px solid var(--color-primary)" : undefined,
          outlineOffset: selected ? 2 : undefined,
          opacity: dimmed ? 0.45 : 1,
        }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {NODE_TYPE_LABELS[node.type]}
        </span>
        <p
          className="mt-1 line-clamp-3 flex-1 text-[14px] leading-snug text-[var(--color-text)]"
          title={node.text}
        >
          {node.text}
        </p>
        <div className="mt-2">
          <TocProvenanceChip sourceIds={node.source_ids} />
        </div>
      </button>
    );
  },
);

export default TocGraphCanvas;
