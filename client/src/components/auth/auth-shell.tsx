import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Surface } from "@/components/ui/surface";

export interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Auth layout — Brand Mode left panel + Product Mode form (DSD §2).
 * Full-viewport split: centered logomark + Fraunces wordmark on dark aside.
 */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside
        data-theme="dark"
        className="relative hidden min-h-dvh bg-[var(--color-bg)] px-10 py-12 lg:flex lg:flex-col"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="hero-dawn-glow absolute inset-0 opacity-80" />
          <div className="hero-grain absolute inset-0 opacity-30" />
        </div>

        {/* Top — compact home link */}
        <Link
          href="/"
          className="relative z-10 inline-flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:[outline:2px_solid_var(--color-primary)] focus-visible:[outline-offset:2px]"
          aria-label="Ciel — back to home"
        >
          <BrandLogo variant="mark" title="" className="h-8 w-8 object-contain" />
          <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold leading-none text-[var(--color-text)]">
            Ciel
          </span>
        </Link>

        {/* Center — brand moment + value copy */}
        <div className="relative z-10 flex flex-1 flex-col justify-center py-10">
          <div className="max-w-md">
            <div className="h-28 w-28 shrink-0 md:h-32 md:w-32">
              <BrandLogo
                variant="mark"
                title="Ciel logomark — sky dome with dawn sun"
                className="h-full w-full object-contain"
              />
            </div>
            <p className="mt-4 font-[family-name:var(--font-fraunces)] text-4xl font-semibold tracking-tight text-[var(--color-text)] md:text-5xl">
              Ciel
            </p>
            <div className="mt-6 h-px w-16 bg-[var(--color-accent)]" aria-hidden />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
              Impact Operating System
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-[clamp(1.75rem,3.5vw,2.25rem)] font-semibold leading-tight tracking-tight text-[var(--color-text)]">
              Ground your impact before you scale it.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-text-muted)]">
              Turn a social need into an evidence-backed Theory of Change, funded proposals,
              and a predictive M&amp;E loop — built for NGOs, LGUs, and foundations.
            </p>
          </div>
        </div>

        {/* Bottom — attribution */}
        <p className="relative z-10 shrink-0 text-xs text-[var(--color-text-muted)]">
          Create &amp; Conquer 2026 · Theme #2
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-4 py-10">
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <BrandLogo variant="mark" title="Ciel logomark" className="h-9 w-auto" />
          <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-[var(--color-text)]">
            Ciel
          </span>
        </div>

        <Surface elevation="md" className="w-full max-w-md p-8 md:p-10">
          <header className="mb-8">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-text)]">
              {title}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          </header>

          {children}

          {footer && (
            <footer className="mt-8 border-t border-[var(--color-border)] pt-6 text-center text-sm text-[var(--color-text-muted)]">
              {footer}
            </footer>
          )}
        </Surface>

        <Link
          href="/"
          className="mt-6 text-sm text-[var(--color-primary)] hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
