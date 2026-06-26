"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { streamGrantGeneration } from "./grant-stream";
import { ProvenanceChip } from "./provenance-chip";
import type { Funder, FunderAlignment, GrantSection } from "@/components/grants/types";
import { Button } from "@/components/ui/button";
import { IconSparkle, IconArrowUpRight, IconBuilding } from "@/components/dashboard/icons";

const EASE = "cubic-bezier(0.22,1,0.36,1)";

function php(n: number | null): string {
  if (n == null) return "—";
  return `₱${n.toLocaleString("en-PH")}`;
}

export function GrantGeneratePanel({
  projectId,
  funders,
}: {
  projectId: string;
  funders: Funder[];
}) {
  const router = useRouter();
  const [funderId, setFunderId] = React.useState(funders[0]?.id ?? "");
  const [amount, setAmount] = React.useState("");
  const [phase, setPhase] = React.useState<"idle" | "streaming" | "saving">("idle");
  const [sections, setSections] = React.useState<GrantSection[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const selected = funders.find((f) => f.id === funderId) ?? funders[0];

  const generate = async () => {
    setError(null);
    setSections([]);
    setPhase("streaming");

    const collected: GrantSection[] = [];
    let capturedAlignment: FunderAlignment[] = [];
    await streamGrantGeneration(
      {
        project_id: projectId,
        funder_id: funderId,
        amount_php: amount ? Number(amount) : null,
      },
      {
        onSection: (s) => {
          collected.push(s);
          setSections((prev) => [...prev, s]);
        },
        onError: (m) => {
          setError(m);
          setPhase("idle");
        },
        onAlignment: (a) => {
          capturedAlignment = a;
        },
        onDone: async ({ sections: finalSections, alignment }) => {
          setPhase("saving");
          const payload = finalSections.length ? finalSections : collected;
          const alignPayload =
            alignment.length > 0 ? alignment : capturedAlignment;
          try {
            const res = await fetch("/api/grants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                project_id: projectId,
                funder_id: funderId,
                title: `${selected?.name ?? "Funder"} — proposal`,
                sections: payload,
                amount_php: amount ? Number(amount) : null,
                alignment: alignPayload,
              }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Save failed");
            router.push(`/projects/${projectId}/grants/${data.id}`);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
            setPhase("idle");
          }
        },
      },
    );
  };

  const busy = phase !== "idle";

  return (
    <div className="space-y-6">
      {/* Funder selection */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Match a funder
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {funders.map((f) => {
            const active = f.id === funderId;
            return (
              <button
                key={f.id}
                type="button"
                disabled={busy}
                onClick={() => setFunderId(f.id)}
                className={[
                  "group rounded-[18px] p-1.5 text-left transition-transform duration-300 disabled:opacity-60",
                  active
                    ? "bg-[color-mix(in_srgb,var(--color-primary)_22%,transparent)]"
                    : "bg-[color-mix(in_srgb,var(--color-border)_40%,transparent)] hover:-translate-y-0.5",
                ].join(" ")}
                style={{ transitionTimingFunction: EASE }}
              >
                <div className="h-full rounded-[12px] bg-[var(--color-surface)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)] text-[var(--color-primary)]">
                      <IconBuilding size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-[var(--color-text)]">{f.name}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-[var(--color-text-muted)]">
                        {f.type} · {f.region ?? "—"}
                      </p>
                    </div>
                    <span
                      className={[
                        "mt-0.5 grid h-5 w-5 place-items-center rounded-full border transition-colors",
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                          : "border-[var(--color-border)]",
                      ].join(" ")}
                    >
                      {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-1 text-[12px] text-[var(--color-text-muted)]">
                    {f.focus_areas.join(" · ")}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                    Typical: {php(f.typical_grant_php_min)}–{php(f.typical_grant_php_max)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount + generate */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="amount" className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Requested amount (₱, optional)
          </label>
          <input
            id="amount"
            type="number"
            inputMode="numeric"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={selected?.typical_grant_php_min?.toString() ?? "500000"}
            className="mt-2 w-48 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-[14px] text-[var(--color-text)] focus:[outline:2px_solid_var(--color-primary)] focus:[outline-offset:2px]"
          />
        </div>
        <Button
          type="button"
          onClick={generate}
          disabled={busy || !funderId}
          className="group gap-2 pl-5 pr-2"
        >
          {phase === "streaming" ? "Drafting…" : phase === "saving" ? "Opening editor…" : "Draft proposal"}
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105">
            {busy ? <IconSparkle size={16} className="animate-pulse" /> : <IconArrowUpRight size={16} />}
          </span>
        </Button>
      </div>

      {error ? (
        <div className="rounded-[12px] border border-[var(--color-error)]/40 bg-[color-mix(in_srgb,var(--color-error)_8%,transparent)] px-4 py-3 text-[13px] text-[var(--color-error)]">
          {error}
        </div>
      ) : null}

      {/* Live streaming preview */}
      {sections.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Drafting live
          </p>
          {sections.map((s) => (
            <div
              key={s.key}
              className="rounded-[16px] bg-[color-mix(in_srgb,var(--color-border)_35%,transparent)] p-1.5"
              style={{ animation: "grantfade 600ms both", animationTimingFunction: EASE }}
            >
              <div className="rounded-[11px] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-[family-name:var(--font-fraunces)] text-[15px] font-semibold text-[var(--color-text)]">
                    {s.heading}
                  </h4>
                  <ProvenanceChip section={s} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                  {s.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <style>{`@keyframes grantfade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { [style*="grantfade"] { animation: none !important; } }`}</style>
    </div>
  );
}
