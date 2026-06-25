import * as React from "react";
import Link from "next/link";
import { StatusPill } from "./status-pill";
import { IconArrowUpRight, IconNodes } from "./icons";

export interface ProjectCardProps {
  id: string;
  need: string;
  status: string;
  createdAt: string;
  tocStatus?: string | null;
  tocVersion?: number | null;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

const TOC_LABEL: Record<string, string> = {
  locked: "ToC locked",
  draft: "ToC in draft",
  superseded: "ToC superseded",
};

export function ProjectCard({ id, need, status, createdAt, tocStatus, tocVersion }: ProjectCardProps) {
  const tocLabel = tocStatus ? TOC_LABEL[tocStatus] ?? "ToC" : "No ToC yet";

  return (
    <Link
      href={`/projects/${id}`}
      className="group block rounded-[18px] bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] p-1.5 outline-none transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 focus-visible:[outline:2px_solid_var(--color-primary)] focus-visible:[outline-offset:2px] active:scale-[0.995]"
    >
      <div className="relative flex items-start gap-4 rounded-[12px] bg-[var(--color-surface)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(11,21,51,0.05)] transition-shadow duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:shadow-[var(--shadow-md)]">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] text-[var(--color-primary)]">
          <IconNodes size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status} />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {tocLabel}
              {tocVersion ? <span className="font-mono normal-case tracking-normal"> · v{tocVersion}</span> : null}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--color-text)]">
            {need}
          </h3>
          <p className="mt-1.5 text-[12px] text-[var(--color-text-muted)]">
            Created {formatDate(createdAt)}
          </p>
        </div>

        <span className="ml-auto mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] text-[var(--color-text)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105 group-hover:bg-[var(--color-primary)] group-hover:text-white">
          <IconArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}

export default ProjectCard;
