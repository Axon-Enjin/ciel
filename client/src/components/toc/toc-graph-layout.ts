import {
  NODE_TYPE_ORDER,
  type TocEdge,
  type TocGraph,
  type TocNode,
  type TocNodeType,
} from "./types";

export type NodePosition = {
  id: string;
  type: TocNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutResult = {
  nodes: NodePosition[];
  width: number;
  height: number;
  columnCenters: Record<TocNodeType, number>;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 120;
const COLUMN_GAP = 48;
const ROW_GAP = 24;
const PADDING = 32;

/** Group nodes by type in canonical order. */
export function groupNodesByType(nodes: TocNode[]): Record<TocNodeType, TocNode[]> {
  const groups = Object.fromEntries(
    NODE_TYPE_ORDER.map((t) => [t, [] as TocNode[]]),
  ) as Record<TocNodeType, TocNode[]>;

  for (const node of nodes) {
    if (groups[node.type]) {
      groups[node.type].push(node);
    }
  }
  return groups;
}

/** Compute stable column/row positions for the logic-model board. */
export function computeGraphLayout(graph: TocGraph): LayoutResult {
  const groups = groupNodesByType(graph.nodes);
  const columnCenters = {} as Record<TocNodeType, number>;
  const positions: NodePosition[] = [];

  let maxRows = 1;
  for (const type of NODE_TYPE_ORDER) {
    maxRows = Math.max(maxRows, groups[type].length || 1);
  }

  const totalWidth =
    PADDING * 2 +
    NODE_TYPE_ORDER.length * NODE_WIDTH +
    (NODE_TYPE_ORDER.length - 1) * COLUMN_GAP;
  const totalHeight =
    PADDING * 2 + maxRows * NODE_HEIGHT + (maxRows - 1) * ROW_GAP;

  NODE_TYPE_ORDER.forEach((type, colIdx) => {
    const colX = PADDING + colIdx * (NODE_WIDTH + COLUMN_GAP);
    columnCenters[type] = colX + NODE_WIDTH / 2;
    const typeNodes = groups[type];

    if (typeNodes.length === 0) return;

    const blockHeight =
      typeNodes.length * NODE_HEIGHT + (typeNodes.length - 1) * ROW_GAP;
    const startY = PADDING + (totalHeight - PADDING * 2 - blockHeight) / 2;

    typeNodes.forEach((node, rowIdx) => {
      positions.push({
        id: node.id,
        type: node.type,
        x: colX,
        y: startY + rowIdx * (NODE_HEIGHT + ROW_GAP),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });
  });

  return {
    nodes: positions,
    width: totalWidth,
    height: totalHeight,
    columnCenters,
  };
}

/** SVG path between two node rectangles (right anchor → left anchor). */
export function edgePath(
  from: NodePosition,
  to: NodePosition,
): string {
  const x1 = from.x + from.width;
  const y1 = from.y + from.height / 2;
  const x2 = to.x;
  const y2 = to.y + to.height / 2;
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

/** Validate edges reference existing nodes. */
export function validateEdges(
  nodes: TocNode[],
  edges: TocEdge[],
): { valid: TocEdge[]; invalidCount: number } {
  const ids = new Set(nodes.map((n) => n.id));
  const valid: TocEdge[] = [];
  let invalidCount = 0;
  for (const edge of edges) {
    if (ids.has(edge.from_node) && ids.has(edge.to_node)) {
      valid.push(edge);
    } else {
      invalidCount += 1;
    }
  }
  return { valid, invalidCount };
}

/** Map node id → position for quick lookup. */
export function positionMap(
  layout: LayoutResult,
): Map<string, NodePosition> {
  return new Map(layout.nodes.map((n) => [n.id, n]));
}
