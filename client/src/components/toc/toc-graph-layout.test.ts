import { describe, expect, it } from "vitest";
import {
  computeGraphLayout,
  validateEdges,
} from "./toc-graph-layout";
import type { TocGraph } from "./types";

const sampleGraph: TocGraph = {
  nodes: [
    { id: "problem-1", type: "problem", text: "Need", source_ids: [] },
    { id: "input-1", type: "input", text: "Inputs", source_ids: [] },
    { id: "activity-1", type: "activity", text: "Activities", source_ids: ["s1"] },
    { id: "output-1", type: "output", text: "Outputs", source_ids: ["s1"] },
    { id: "outcome-1", type: "outcome", text: "Outcomes", source_ids: ["s1"] },
    { id: "impact-1", type: "impact", text: "Impact", source_ids: ["s1"] },
  ],
  edges: [
    { from_node: "problem-1", to_node: "input-1" },
    { from_node: "input-1", to_node: "activity-1" },
    { from_node: "activity-1", to_node: "output-1" },
    { from_node: "output-1", to_node: "outcome-1" },
    { from_node: "outcome-1", to_node: "impact-1" },
  ],
};

describe("computeGraphLayout", () => {
  it("returns stable positions for all nodes", () => {
    const a = computeGraphLayout(sampleGraph);
    const b = computeGraphLayout(sampleGraph);

    expect(a.nodes).toHaveLength(6);
    expect(a.nodes.map((n) => n.id)).toEqual(b.nodes.map((n) => n.id));
    expect(a.nodes.map((n) => [n.x, n.y])).toEqual(b.nodes.map((n) => [n.x, n.y]));
    expect(a.width).toBeGreaterThan(900);
    expect(a.height).toBeGreaterThan(100);
  });

  it("places problem column before impact column", () => {
    const layout = computeGraphLayout(sampleGraph);
    const problem = layout.nodes.find((n) => n.id === "problem-1")!;
    const impact = layout.nodes.find((n) => n.id === "impact-1")!;
    expect(problem.x).toBeLessThan(impact.x);
  });
});

describe("validateEdges", () => {
  it("accepts edges with valid node pairs", () => {
    const { valid, invalidCount } = validateEdges(
      sampleGraph.nodes,
      sampleGraph.edges,
    );
    expect(valid).toHaveLength(5);
    expect(invalidCount).toBe(0);
  });

  it("rejects edges referencing missing nodes", () => {
    const { valid, invalidCount } = validateEdges(sampleGraph.nodes, [
      { from_node: "problem-1", to_node: "missing" },
    ]);
    expect(valid).toHaveLength(0);
    expect(invalidCount).toBe(1);
  });
});
