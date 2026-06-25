/** Thin F3 demo — static ADAPT signal card (M3 optional slice). */

export function SignalDemoCard() {
  return (
    <div className="rounded-[var(--radius-surface)] border border-[var(--color-warning)]/50 bg-white p-6 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-warning)]">
            M&amp;E signal · ADAPT
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-[var(--color-text)]">
            Attendance below assumption threshold
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Session attendance averaged 9.2 over the last 3 weeks — below the locked ToC
            assumption threshold of 12. Consider adjusting outreach or session format before
            scaling.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
          Demo
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-[var(--color-text-muted)]">Indicator</dt>
          <dd className="font-mono text-[var(--color-text)]">attendance_per_session</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)]">Threshold</dt>
          <dd className="font-mono text-[var(--color-text)]">≥ 12.0</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-[var(--color-text-muted)]">
        Full F3 (field PWA + SMS + live signals) ships in the next slice — this card previews
        the dashboard language.
      </p>
    </div>
  );
}
