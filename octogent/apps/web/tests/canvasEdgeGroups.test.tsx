import { describe, expect, it } from "vitest";

import type { GraphNode } from "../src/app/canvas/types";
import { buildSessionEdgeGroups } from "../src/app/canvasEdgeGroups";

function makeNode(id: string, overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id,
    type: "active-session",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    pinned: false,
    radius: 12,
    tentacleId: "t-1",
    label: id,
    color: "#aaa",
    agentState: "live",
    hasUserPrompt: true,
    ...overrides,
  };
}

describe("buildSessionEdgeGroups", () => {
  it("returns empty maps when there are no edges", () => {
    const result = buildSessionEdgeGroups([], new Map(), false);
    expect(result.sessionEdges).toHaveLength(0);
    expect(result.sessionEdgesBySource.size).toBe(0);
  });

  it("filters out edges whose nodes are not both active-session", () => {
    const tentacleNode = makeNode("t:a", { type: "tentacle" });
    const sessionNode = makeNode("s:a");
    const nodesById = new Map<string, GraphNode>([
      ["t:a", tentacleNode],
      ["s:a", sessionNode],
    ]);
    const result = buildSessionEdgeGroups([{ source: "t:a", target: "s:a" }], nodesById, false);
    expect(result.sessionEdges).toHaveLength(0);
  });

  it("builds one group with two edges from the same source", () => {
    const a = makeNode("a", { x: 0, y: 0 });
    const b = makeNode("b", { x: 10, y: 0 });
    const c = makeNode("c", { x: 0, y: 10 });
    const nodesById = new Map<string, GraphNode>([
      ["a", a],
      ["b", b],
      ["c", c],
    ]);
    const edges = [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
    ];
    const result = buildSessionEdgeGroups(edges, nodesById, false);
    expect(result.sessionEdges).toHaveLength(2);
    expect(result.sessionEdgesBySource.get("a")).toHaveLength(2);
    // No group for b or c as sources
    expect(result.sessionEdgesBySource.get("b")).toBeUndefined();
  });

  it("excludes idle terminals when hideIdleTerminals is true", () => {
    const a = makeNode("a");
    const b = makeNode("b", { agentState: "idle" });
    const nodesById = new Map<string, GraphNode>([
      ["a", a],
      ["b", b],
    ]);
    const result = buildSessionEdgeGroups([{ source: "a", target: "b" }], nodesById, true);
    expect(result.sessionEdges).toHaveLength(0);
  });

  it("excludes edges where hasUserPrompt is false when hideIdleTerminals is true", () => {
    const a = makeNode("a");
    const b = makeNode("b", { hasUserPrompt: false });
    const nodesById = new Map<string, GraphNode>([
      ["a", a],
      ["b", b],
    ]);
    const result = buildSessionEdgeGroups([{ source: "a", target: "b" }], nodesById, true);
    expect(result.sessionEdges).toHaveLength(0);
  });

  it("does NOT exclude idle terminals when hideIdleTerminals is false", () => {
    const a = makeNode("a");
    const b = makeNode("b", { agentState: "idle" });
    const nodesById = new Map<string, GraphNode>([
      ["a", a],
      ["b", b],
    ]);
    const result = buildSessionEdgeGroups([{ source: "a", target: "b" }], nodesById, false);
    expect(result.sessionEdges).toHaveLength(1);
  });

  it("sorts edges within a group by angle", () => {
    // source at origin, two targets at different angles
    const src = makeNode("src", { x: 0, y: 0 });
    // angle 0 (east)
    const east = makeNode("east", { x: 10, y: 0 });
    // angle π/2 (south in canvas coords)
    const south = makeNode("south", { x: 0, y: 10 });
    const nodesById = new Map<string, GraphNode>([
      ["src", src],
      ["east", east],
      ["south", south],
    ]);
    // Provide in reverse angular order to verify sort
    const edges = [
      { source: "src", target: "south" },
      { source: "src", target: "east" },
    ];
    const result = buildSessionEdgeGroups(edges, nodesById, false);
    const group = result.sessionEdgesBySource.get("src");
    expect(group).toBeDefined();
    expect(group?.[0]?.target.id).toBe("east"); // angle 0 comes first
    expect(group?.[1]?.target.id).toBe("south"); // angle π/2 comes second
  });
});
