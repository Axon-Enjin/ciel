import { SIGNAL_LABELS, SIGNAL_TONE, type MandeSignal } from "./types";

export function SignalCard({ signal }: { signal: MandeSignal }) {
  const tone = SIGNAL_TONE[signal.signal_type];
  const label = SIGNAL_LABELS[signal.signal_type];

  return (
    <article
      className="rounded-surface border bg-surface p-6 shadow-sm"
      style={{
        borderColor: `color-mix(in srgb, ${tone} 40%, var(--color-border))`,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: tone }}
          >
            M&amp;E signal · {label}
          </p>
          <h3 className="mt-2 font-display text-lg font-semibold text-[var(--color-text)]">
            {signal.signal_type === "adapt"
              ? "Indicator below assumption threshold"
              : signal.signal_type === "stop"
                ? "Critical assumption breach"
                : "Program exceeding target"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {signal.rationale}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-[var(--color-text-muted)]">
        Human review required — Ciel recommends; it never auto-executes program changes.
      </p>
    </article>
  );
}

export default SignalCard;
