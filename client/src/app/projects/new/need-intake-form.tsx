"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NeedIntakeForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [need, setNeed] = useState("");
  const [region, setRegion] = useState("");
  const [population, setPopulation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/needs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, need: need.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        return;
      }

      const projectId = data.project.id as string;
      const params = new URLSearchParams({ generate: "1" });
      if (region.trim()) params.set("region", region.trim());
      if (population.trim()) params.set("population", population.trim());
      router.push(`/projects/${projectId}/toc?${params.toString()}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <div>
        <label htmlFor="need" className="block text-sm font-medium text-[var(--color-text)]">
          Social need
        </label>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Describe the problem in plain language — who is affected and what outcome you seek.
        </p>
        <textarea
          id="need"
          required
          minLength={10}
          rows={5}
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          className="mt-2 block w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-text)]"
          placeholder="Youth in our barangay lack stable employment pathways after senior high school…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="region" className="block text-sm font-medium text-[var(--color-text)]">
            Region
          </label>
          <input
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
            placeholder="Metro Manila"
          />
        </div>
        <div>
          <label htmlFor="population" className="block text-sm font-medium text-[var(--color-text)]">
            Population
          </label>
          <input
            id="population"
            value={population}
            onChange={(e) => setPopulation(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2"
            placeholder="Out-of-school youth 18–24"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || need.trim().length < 10}
        className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {loading ? "Creating project…" : "Continue to ToC Studio"}
      </button>
    </form>
  );
}
