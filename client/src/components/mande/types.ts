import type { FunderAlignment } from "@/components/grants/types";

export type SignalType = "scale" | "adapt" | "stop";

export type MandeSignal = {
  id: string;
  assumption_id: string | null;
  signal_type: SignalType;
  rationale: string;
  created_at: string;
};

export type TocAssumptionRow = {
  id: string;
  statement: string;
  indicator: string;
  threshold: number | null;
};

export type IndicatorPointRow = {
  indicator: string;
  value: number;
  observed_at: string;
};

export const SIGNAL_LABELS: Record<SignalType, string> = {
  scale: "Scale",
  adapt: "Adapt",
  stop: "Stop",
};

export const SIGNAL_TONE: Record<SignalType, string> = {
  scale: "var(--color-success)",
  adapt: "var(--color-warning)",
  stop: "var(--color-error)",
};

export function resolveAlignment(
  stored: FunderAlignment[] | null | undefined,
  fallback: FunderAlignment[],
): FunderAlignment[] {
  if (stored && stored.length > 0) return stored;
  return fallback;
}
