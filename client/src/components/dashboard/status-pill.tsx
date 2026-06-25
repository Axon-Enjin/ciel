import * as React from "react";

/**
 * StatusPill — a calm, semantic state chip for project lifecycle states.
 *
 * Colors map to the DSD §2 signal palette (success / data / accent / error)
 * via token-driven inline color-mix tints — no glassmorphism, no harsh fills.
 * A tiny leading dot carries the hue so the label stays legible (AA).
 */
type ProjectStatus = "draft" | "active" | "scaling" | "stopped";

const STATUS: Record<
  ProjectStatus,
  { label: string; token: string }
> = {
  draft: { label: "Draft", token: "var(--color-text-muted)" },
  active: { label: "Active", token: "var(--color-data)" },
  scaling: { label: "Scaling", token: "var(--color-success)" },
  stopped: { label: "Stopped", token: "var(--color-error)" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[(status as ProjectStatus)] ?? STATUS.draft;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
      style={{
        color: s.token,
        backgroundColor: `color-mix(in srgb, ${s.token} 12%, transparent)`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: s.token }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}

export default StatusPill;
