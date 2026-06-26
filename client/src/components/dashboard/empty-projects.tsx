import * as React from "react";
import Link from "next/link";
import { IconNodes, IconArrowUpRight } from "./icons";

/** Calm, encouraging empty state for an org with no projects yet. */
export function EmptyProjects({ orgId }: { orgId: string }) {
  return (
    <div className="rounded-[24px] bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] p-1.5">
      <div className="relative overflow-hidden rounded-[18px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] text-[var(--color-primary)]">
          <IconNodes size={26} />
        </span>
        <h3 className="mt-5 font-[family-name:var(--font-fraunces)] text-[22px] font-semibold text-[var(--color-text)]">
          Start with a single need
        </h3>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-[var(--color-text-muted)]">
          Name the social need you want to address. Ciel grounds it in evidence and drafts a
          Theory of Change you can interrogate, lock, and measure.
        </p>
        <Link
          href={`/projects/new?org=${orgId}`}
          className="group mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] py-2.5 pl-5 pr-2 text-[14px] font-semibold text-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--color-primary-hover)] active:scale-[0.98]"
        >
          Draft your first Theory of Change
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
            <IconArrowUpRight size={16} />
          </span>
        </Link>
      </div>
    </div>
  );
}

export default EmptyProjects;
