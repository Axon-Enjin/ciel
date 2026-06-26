import * as React from "react";
import Link from "next/link";
import { StatusPill } from "./status-pill";
import { IconArrowUpRight, IconNodes, IconReport } from "./icons";

import { withOrgQuery } from "@/lib/workspace-context";

export interface ProjectCardProps {
  id: string;
  orgId: string;
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

export function ProjectCard({ id, orgId, need, status, createdAt, tocStatus, tocVersion }: ProjectCardProps) {
  const tocLabel = tocStatus ? TOC_LABEL[tocStatus] ?? "ToC" : "No ToC yet";
  const tocLocked = tocStatus === "locked";
  const projectHref = withOrgQuery(`/projects/${id}`, orgId);

  return (
    <div className="group rounded-[18px] bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] p-1.5 transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5">
      <Link
        href={projectHref}
        className="block rounded-[12px] bg-[var(--color-surface)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_2px_rgba(11,21,51,0.05)] outline-none transition-shadow duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:shadow-[var(--shadow-md)] focus-visible:[outline:2px_solid_var(--color-primary)] focus-visible:[outline-offset:2px]"
      >
        <div className="relative flex items-start gap-4">
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

      <div className="mt-2 flex flex-wrap gap-2 px-3 pb-2">
        <Link
          href={`/projects/${id}/toc`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          <IconNodes size={14} />
          ToC
        </Link>
        {tocLocked && (
          <Link
            href={`/projects/${id}/grants`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <IconReport size={14} />
            Grants
          </Link>
        )}
      </div>
    </div>
  );
}

export default ProjectCard;
