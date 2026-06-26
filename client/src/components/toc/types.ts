/** ToC graph types — shared between studio, canvas, and SSE handlers. */

export type TocNodeType =
  | "problem"
  | "input"
  | "activity"
  | "output"
  | "outcome"
  | "impact";

export type TocNode = {
  id: string;
  type: TocNodeType;
  text: string;
  source_ids: string[];
};

export type TocEdge = {
  from_node: string;
  to_node: string;
  relationship?: string;
};

export type TocGraph = {
  nodes: TocNode[];
  edges: TocEdge[];
};

export type TocDelta = {
  path: string;
  id: string;
  type: TocNodeType;
  text: string;
  source_ids: string[];
};

export type FailurePrompt = {
  id?: string;
  prompt: string;
  source_ids: string[];
  acknowledged?: boolean;
};

export type TocAssumption = {
  id?: string;
  statement: string;
  indicator: string;
  threshold?: number | null;
};

export const NODE_TYPE_ORDER: TocNodeType[] = [
  "problem",
  "input",
  "activity",
  "output",
  "outcome",
  "impact",
];

export const NODE_TYPE_LABELS: Record<TocNodeType, string> = {
  problem: "Problem",
  input: "Input",
  activity: "Activity",
  output: "Output",
  outcome: "Outcome",
  impact: "Impact",
};
