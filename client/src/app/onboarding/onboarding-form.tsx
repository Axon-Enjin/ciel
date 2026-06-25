"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ORG_TYPES = [
  { value: "ngo", label: "NGO / Non-profit" },
  { value: "lgu", label: "Local government (LGU)" },
  { value: "foundation", label: "Foundation" },
  { value: "csr", label: "CSR / Corporate" },
] as const;

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState<(typeof ORG_TYPES)[number]["value"]>("ngo");
  const [mission, setMission] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          org_type: orgType,
          mission: mission.trim() || null,
          region: region.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create workspace");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--color-text)]">
          Organization name
        </label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-text)]"
          placeholder="Bayanihan Youth Initiative"
        />
      </div>

      <div>
        <label htmlFor="orgType" className="block text-sm font-medium text-[var(--color-text)]">
          Organization type
        </label>
        <select
          id="orgType"
          value={orgType}
          onChange={(e) => setOrgType(e.target.value as typeof orgType)}
          className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-text)]"
        >
          {ORG_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="mission" className="block text-sm font-medium text-[var(--color-text)]">
          Mission (optional)
        </label>
        <textarea
          id="mission"
          rows={3}
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-text)]"
          placeholder="What change does your organization pursue?"
        />
      </div>

      <div>
        <label htmlFor="region" className="block text-sm font-medium text-[var(--color-text)]">
          Region (optional)
        </label>
        <input
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-[var(--color-text)]"
          placeholder="Metro Manila, Philippines"
        />
      </div>

      <button
        type="submit"
        disabled={loading || name.trim().length < 2}
        className="w-full rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {loading ? "Creating workspace…" : "Create workspace"}
      </button>
    </form>
  );
}
