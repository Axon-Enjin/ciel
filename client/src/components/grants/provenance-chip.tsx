import * as React from "react";
import type { GrantSection } from "./types";

/**
 * Provenance chip (DSD §4): every AI output carries either a grounded source
 * count or an explicit "unverified — needs human input" flag. A human-edited
 * section is marked as such so authorship is always visible.
 */
export function ProvenanceChip({ section }: { section: GrantSection }) {
  if (section.edited_by_human) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" />
        Human-edited
      </span>
    );
  }

  const count = section.source_ids?.length ?? 0;
  const grounded = count > 0;
  const token = grounded ? "var(--color-success)" : "var(--color-warning)";

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: token, backgroundColor: `color-mix(in srgb, ${token} 12%, transparent)` }}
      title={grounded ? `${count} evidence/ToC source(s)` : "Not grounded — needs human review"}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: token }} />
      {grounded ? `${count} cited` : "Unverified"}
    </span>
  );
}

export default ProvenanceChip;
