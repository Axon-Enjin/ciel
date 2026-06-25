"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { TocProvenanceChip } from "./toc-provenance-chip";
import { NODE_TYPE_LABELS, type TocNode } from "./types";

export type TocNodeDetailPanelProps = {
  node: TocNode | null;
  onClose: () => void;
};

export function TocNodeDetailPanel({ node, onClose }: TocNodeDetailPanelProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const headingId = React.useId();

  React.useEffect(() => {
    if (node) {
      closeRef.current?.focus();
    }
  }, [node?.id]);

  if (!node) return null;

  return (
    <Surface
      as="section"
      role="region"
      aria-labelledby={headingId}
      className="mt-4 p-6"
      elevation="sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p
            id={headingId}
            className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]"
          >
            {NODE_TYPE_LABELS[node.type]}
          </p>
          <p className="mt-3 text-body text-[var(--color-text)]">{node.text}</p>
        </div>
        <Button
          ref={closeRef}
          type="button"
          variant="ghost"
          onClick={onClose}
          className="shrink-0"
        >
          Close
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
        <TocProvenanceChip sourceIds={node.source_ids} />
        {node.source_ids.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-mono text-[var(--color-data)]">
            {node.source_ids.map((sid) => (
              <li
                key={sid}
                className="rounded-full bg-[color-mix(in_srgb,var(--color-data)_10%,transparent)] px-2 py-0.5 text-[11px]"
              >
                {sid.slice(0, 8)}…
              </li>
            ))}
          </ul>
        )}
      </div>
    </Surface>
  );
}

export default TocNodeDetailPanel;
