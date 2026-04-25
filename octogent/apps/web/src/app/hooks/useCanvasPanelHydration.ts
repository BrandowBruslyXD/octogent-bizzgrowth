import { useEffect, useRef, useState } from "react";

import type { GraphNode } from "../canvas/types";
import type { TerminalView } from "../types";

type UseCanvasPanelHydrationParams = {
  isUiStateHydrated: boolean | undefined;
  canvasOpenTerminalIds: string[] | undefined;
  canvasOpenTentacleIds: string[] | undefined;
  persistedTerminalsPanelWidth: number | null | undefined;
  nodesById: Map<string, GraphNode>;
  simulatedNodes: GraphNode[];
  columns: TerminalView;
  onCanvasOpenTerminalIdsChange: ((ids: string[]) => void) | undefined;
  onCanvasOpenTentacleIdsChange: ((ids: string[]) => void) | undefined;
  onCanvasTerminalsPanelWidthChange: ((width: number | null) => void) | undefined;
};

type UseCanvasPanelHydrationResult = {
  openTerminals: Map<string, GraphNode>;
  setOpenTerminals: React.Dispatch<React.SetStateAction<Map<string, GraphNode>>>;
  openTentacles: Map<string, GraphNode>;
  setOpenTentacles: React.Dispatch<React.SetStateAction<Map<string, GraphNode>>>;
  terminalsPanelWidth: number | null;
  setTerminalsPanelWidth: React.Dispatch<React.SetStateAction<number | null>>;
  isHydratingTerminals: boolean;
  hasHydratedTerminals: React.MutableRefObject<boolean>;
  hasHydratedTentacles: React.MutableRefObject<boolean>;
};

/**
 * Manages hydration of open panel state from persisted IDs and syncs changes
 * back to the parent via callbacks. Handles the async settling delay needed so
 * the force-simulation graph has time to populate before we look up nodes.
 */
export function useCanvasPanelHydration({
  isUiStateHydrated,
  canvasOpenTerminalIds,
  canvasOpenTentacleIds,
  persistedTerminalsPanelWidth,
  nodesById,
  simulatedNodes,
  columns,
  onCanvasOpenTerminalIdsChange,
  onCanvasOpenTentacleIdsChange,
  onCanvasTerminalsPanelWidthChange,
}: UseCanvasPanelHydrationParams): UseCanvasPanelHydrationResult {
  const [openTerminals, setOpenTerminals] = useState<Map<string, GraphNode>>(new Map());
  const [openTentacles, setOpenTentacles] = useState<Map<string, GraphNode>>(new Map());
  const [terminalsPanelWidth, setTerminalsPanelWidth] = useState<number | null>(null);
  const [isHydratingTerminals, setIsHydratingTerminals] = useState(false);

  const hasHydratedTerminals = useRef(false);
  const hasHydratedTentacles = useRef(false);

  // Step 1: kick off a settling timer so the simulation/graph is ready before
  // we attempt to look up node positions by persisted ID.
  useEffect(() => {
    if (hasHydratedTerminals.current) return;
    if (!isUiStateHydrated) return;
    if (!canvasOpenTerminalIds || canvasOpenTerminalIds.length === 0) {
      hasHydratedTerminals.current = true;
      return;
    }

    setIsHydratingTerminals(true);
    const timer = window.setTimeout(() => {
      setIsHydratingTerminals(false);
      hasHydratedTerminals.current = true;
    }, 800);

    return () => window.clearTimeout(timer);
  }, [isUiStateHydrated, canvasOpenTerminalIds]);

  // Step 2: once the settling timer fires, restore the open-terminal map from
  // persisted IDs now that the simulation graph should be fully populated.
  const openTerminalCount = openTerminals.size;
  useEffect(() => {
    if (isHydratingTerminals) return;
    if (!hasHydratedTerminals.current) return;
    if (openTerminalCount > 0) return;
    if (!canvasOpenTerminalIds || canvasOpenTerminalIds.length === 0) return;

    const restoredMap = new Map<string, GraphNode>();
    for (const nodeId of canvasOpenTerminalIds) {
      const node = nodesById.get(nodeId);
      if (node && node.type === "active-session") {
        restoredMap.set(nodeId, { ...node });
      }
    }
    if (restoredMap.size > 0) {
      setOpenTerminals(restoredMap);
    }

    if (persistedTerminalsPanelWidth != null && persistedTerminalsPanelWidth > 0) {
      setTerminalsPanelWidth(persistedTerminalsPanelWidth);
    }
  }, [
    isHydratingTerminals,
    openTerminalCount,
    canvasOpenTerminalIds,
    persistedTerminalsPanelWidth,
    nodesById,
  ]);

  // Persist open terminal IDs when they change.
  useEffect(() => {
    if (!hasHydratedTerminals.current) return;
    onCanvasOpenTerminalIdsChange?.(Array.from(openTerminals.keys()));
  }, [openTerminals, onCanvasOpenTerminalIdsChange]);

  // Keep terminal metadata in sync when columns change (e.g. renames, state
  // transitions). Does not add or remove terminals — just patches existing entries.
  useEffect(() => {
    setOpenTerminals((current) => {
      let didChange = false;
      const next = new Map<string, GraphNode>();

      for (const [nodeId, node] of current) {
        if (!node.sessionId) {
          next.set(nodeId, node);
          continue;
        }

        const terminal = columns.find((entry) => entry.terminalId === node.sessionId);
        if (!terminal) {
          didChange = true;
          continue;
        }

        const nextLabel = terminal.tentacleName || terminal.label || terminal.terminalId;
        const nextNode: GraphNode = {
          ...node,
          tentacleId: terminal.tentacleId,
          label: nextLabel,
          agentState: terminal.state,
          hasUserPrompt: terminal.hasUserPrompt ?? false,
          ...(terminal.workspaceMode ? { workspaceMode: terminal.workspaceMode } : {}),
          ...(terminal.parentTerminalId ? { parentTerminalId: terminal.parentTerminalId } : {}),
        };

        if (
          node.label !== nextNode.label ||
          node.tentacleId !== nextNode.tentacleId ||
          node.agentState !== nextNode.agentState ||
          node.hasUserPrompt !== nextNode.hasUserPrompt ||
          node.workspaceMode !== nextNode.workspaceMode ||
          node.parentTerminalId !== nextNode.parentTerminalId
        ) {
          didChange = true;
          next.set(nodeId, nextNode);
          continue;
        }

        next.set(nodeId, node);
      }

      return didChange ? next : current;
    });
  }, [columns]);

  // Hydrate open tentacles from persisted IDs.
  // Gate on tentacle-type nodes being present (deck API fetch is async).
  const hasTentacleNodes = simulatedNodes.some((n) => n.type === "tentacle");
  const openTentacleCount = openTentacles.size;
  useEffect(() => {
    if (hasHydratedTentacles.current) return;
    if (!isUiStateHydrated) return;
    if (!hasTentacleNodes) return;

    if (canvasOpenTentacleIds && canvasOpenTentacleIds.length > 0) {
      const restoredMap = new Map<string, GraphNode>();
      for (const nodeId of canvasOpenTentacleIds) {
        const node = nodesById.get(nodeId);
        if (node && (node.type === "tentacle" || node.type === "octoboss")) {
          restoredMap.set(nodeId, { ...node });
        }
      }
      if (restoredMap.size > 0) {
        setOpenTentacles(restoredMap);
      }
    }

    hasHydratedTentacles.current = true;
  }, [isUiStateHydrated, canvasOpenTentacleIds, hasTentacleNodes, nodesById]);

  // Persist open tentacle IDs when they change.
  useEffect(() => {
    if (!hasHydratedTentacles.current) return;
    onCanvasOpenTentacleIdsChange?.(Array.from(openTentacles.keys()));
  }, [openTentacles, onCanvasOpenTentacleIdsChange]);

  // Persist terminals panel width only when user has explicitly dragged the divider.
  useEffect(() => {
    if (!hasHydratedTerminals.current) return;
    if (terminalsPanelWidth == null) return;
    onCanvasTerminalsPanelWidthChange?.(terminalsPanelWidth);
  }, [terminalsPanelWidth, onCanvasTerminalsPanelWidthChange]);

  return {
    openTerminals,
    setOpenTerminals,
    openTentacles,
    setOpenTentacles,
    terminalsPanelWidth,
    setTerminalsPanelWidth,
    isHydratingTerminals,
    hasHydratedTerminals,
    hasHydratedTentacles,
  };
}
