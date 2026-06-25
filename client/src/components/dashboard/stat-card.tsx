import * as React from "react";

/**
 * StatCard — a KPI tile built with the nested "double-bezel" architecture:
 * an outer tray (subtle border-tinted shell) cradling an inner surface core
 * with concentric radii and a hairline inset highlight. Premium through
 * structure and restraint, not glass or shadow theatrics (DSD §0/§4).
 *
 * The optional `horizon` flag draws the dawn-gold baseline motif (DSD §0) —
 * the user's data literally resting on a rising horizon line.
 */
export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Token color for the eyebrow accent dot (defaults to muted). */
  accent?: string;
  /** Draw the signature dawn-gold horizon line under the value. */
  horizon?: boolean;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, hint, accent, horizon, icon }: StatCardProps) {
  return (
    <div className="rounded-[20px] bg-[color-mix(in_srgb,var(--color-border)_45%,transparent)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--color-text)_5%,transparent)]">
      <div className="relative overflow-hidden rounded-[14px] bg-[var(--color-surface)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(11,21,51,0.05)]">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accent ?? "var(--color-text-muted)" }}
              aria-hidden
            />
            {label}
          </span>
          {icon ? (
            <span className="text-[var(--color-text-muted)]">{icon}</span>
          ) : null}
        </div>

        <p className="mt-4 font-[family-name:var(--font-fraunces)] text-[2.5rem] font-semibold leading-none tracking-tight text-[var(--color-text)]">
          {value}
        </p>

        {hint ? (
          <p className="mt-2 text-[13px] leading-snug text-[var(--color-text-muted)]">{hint}</p>
        ) : null}

        {horizon ? (
          <svg
            className="mt-4 h-7 w-full"
            viewBox="0 0 240 28"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient id="dawnline" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--color-accent)" stopOpacity="0.15" />
                <stop offset="0.5" stopColor="var(--color-accent)" />
                <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <path
              d="M0 24 C 40 24, 60 10, 100 9 C 150 8, 175 18, 240 5"
              stroke="var(--color-accent)"
              strokeOpacity="0.35"
              strokeWidth="1.5"
            />
            <line x1="0" y1="26" x2="240" y2="26" stroke="url(#dawnline)" strokeWidth="2" />
          </svg>
        ) : null}
      </div>
    </div>
  );
}

export default StatCard;
