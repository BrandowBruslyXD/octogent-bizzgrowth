import type { GraphNode } from "./canvas/types";

type SessionEdge = { source: GraphNode; target: GraphNode };

/**
 * Builds the set of active-session↔active-session edges from the raw edge list,
 * then groups them by source and sorts each group by angle for consistent
 * multi-edge curvature rendering.
 *
 * Pure function — no side effects, safe to call in render or useMemo.
 */
export function buildSessionEdgeGroups(
  edges: Array<{ source: string; target: string }>,
  nodesById: Map<string, GraphNode>,
  hideIdleTerminals: boolean,
): {
  sessionEdges: SessionEdge[];
  sessionEdgesBySource: Map<string, SessionEdge[]>;
} {
  const sessionEdges: SessionEdge[] = edges
    .map((edge) => {
      const source = nodesById.get(edge.source);
      const target = nodesById.get(edge.target);
      if (!source || !target) return null;
      if (source.type !== "active-session" || target.type !== "active-session") return null;
      if (
        hideIdleTerminals &&
        (source.agentState === "idle" ||
          source.hasUserPrompt === false ||
          target.agentState === "idle" ||
          target.hasUserPrompt === false)
      ) {
        return null;
      }
      return { source, target };
    })
    .filter((edge): edge is SessionEdge => edge !== null);

  const sessionEdgesBySource = new Map<string, SessionEdge[]>();
  for (const edge of sessionEdges) {
    const group = sessionEdgesBySource.get(edge.source.id);
    if (group) {
      group.push(edge);
    } else {
      sessionEdgesBySource.set(edge.source.id, [edge]);
    }
  }

  for (const group of sessionEdgesBySource.values()) {
    group.sort((left, right) => {
      const leftAngle = Math.atan2(left.target.y - left.source.y, left.target.x - left.source.x);
      const rightAngle = Math.atan2(
        right.target.y - right.source.y,
        right.target.x - right.source.x,
      );
      return leftAngle - rightAngle;
    });
  }

  return { sessionEdges, sessionEdgesBySource };
}
