import * as React from "react";

/**
 * Provenance chip for ToC nodes (DSD §4) — mirrors grants ProvenanceChip styling.
 */
export function TocProvenanceChip({
  sourceIds,
}: {
  sourceIds: string[];
}) {
  const count = sourceIds?.length ?? 0;
  const grounded = count > 0;
  const token = grounded ? "var(--color-success)" : "var(--color-warning)";

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{
        color: token,
        backgroundColor: `color-mix(in srgb, ${token} 12%, transparent)`,
      }}
      title={
        grounded
          ? `${count} evidence source(s)`
          : "Not grounded — needs human review"
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: token }}
      />
      {grounded ? `${count} cited` : "Unverified"}
    </span>
  );
}

export default TocProvenanceChip;
