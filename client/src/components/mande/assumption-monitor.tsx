import type { IndicatorPointRow, TocAssumptionRow } from "./types";

function latestValue(
  indicator: string,
  points: IndicatorPointRow[],
): number | null {
  const matches = points
    .filter((p) => p.indicator === indicator)
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at));
  return matches[0]?.value ?? null;
}

export function AssumptionMonitor({
  assumptions,
  points,
}: {
  assumptions: TocAssumptionRow[];
  points: IndicatorPointRow[];
}) {
  if (assumptions.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Lock a Theory of Change to extract measurable assumptions for monitoring.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {assumptions.map((a) => {
        const current = latestValue(a.indicator, points);
        const threshold = a.threshold;
        const breached =
          current != null && threshold != null && current < threshold;

        return (
          <li
            key={a.id}
            className="rounded-surface border border-[var(--color-border)] bg-surface px-4 py-3"
          >
            <p className="text-sm font-medium text-[var(--color-text)]">
              {a.statement}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-3">
              <div>
                <dt className="text-[var(--color-text-muted)]">Indicator</dt>
                <dd className="font-mono text-[var(--color-data)]">
                  {a.indicator}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Threshold</dt>
                <dd className="font-mono text-[var(--color-text)]">
                  {threshold != null ? `≥ ${threshold}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Latest</dt>
                <dd
                  className="font-mono"
                  style={{
                    color: breached
                      ? "var(--color-warning)"
                      : "var(--color-text)",
                  }}
                >
                  {current != null ? current : "—"}
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

export default AssumptionMonitor;
