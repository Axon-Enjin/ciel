"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import type { TocAssumptionRow } from "./types";

export function FieldEntryForm({
  projectId,
  assumptions,
}: {
  projectId: string;
  assumptions: TocAssumptionRow[];
}) {
  const router = useRouter();
  const [indicator, setIndicator] = React.useState(
    assumptions[0]?.indicator ?? "attendance_per_session",
  );
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const options =
    assumptions.length > 0
      ? assumptions.map((a) => a.indicator)
      : ["attendance_per_session", "leading_outcome_rate"];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/field-entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicator,
          value: Number(value),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to record entry");
      }
      setValue("");
      const signalCount = Array.isArray(data.signals) ? data.signals.length : 0;
      setSuccess(
        signalCount > 0
          ? "Recorded — a new M&E signal was generated."
          : "Recorded — indicators updated.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface as="form" onSubmit={submit} className="p-6" elevation="sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
        Record field data
      </p>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Log a leading indicator from the field — web capture for this demo slice.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="field-indicator"
            className="block text-sm font-medium text-[var(--color-text)]"
          >
            Indicator
          </label>
          <select
            id="field-indicator"
            value={indicator}
            onChange={(e) => setIndicator(e.target.value)}
            className="mt-1 block w-full min-h-[44px] rounded-control border border-[var(--color-border)] bg-surface px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="field-value"
            className="block text-sm font-medium text-[var(--color-text)]"
          >
            Value
          </label>
          <input
            id="field-value"
            type="number"
            step="any"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 9.2"
            className="mt-1 block w-full min-h-[44px] rounded-control border border-[var(--color-border)] bg-surface px-3 py-2 font-mono text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          />
        </div>
      </div>

      <div className="mt-4">
        <Button type="submit" disabled={loading || !value}>
          {loading ? "Saving…" : "Record entry"}
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-[var(--color-error)]">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-sm text-[var(--color-success)]">{success}</p>
      )}
    </Surface>
  );
}

export default FieldEntryForm;
