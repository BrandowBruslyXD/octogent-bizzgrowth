import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { WorkspaceSetupSnapshot, WorkspaceSetupStepId } from "@octogent/core";
import { Check as CheckIcon, ChevronDown, X } from "lucide-react";
import type { GraphNode } from "../app/canvas/types";
import { buildSessionEdgeGroups } from "../app/canvasEdgeGroups";
import { useAgentRuntimeStates } from "../app/hooks/useAgentRuntimeStates";
import { useCanvasGraphData } from "../app/hooks/useCanvasGraphData";
import { useCanvasPanelHydration } from "../app/hooks/useCanvasPanelHydration";
import { useCanvasTransform } from "../app/hooks/useCanvasTransform";
import { useConsultorActiveTools } from "../app/hooks/useConsultorActiveTools";
import { DEFAULT_FORCE_PARAMS, useForceSimulation } from "../app/hooks/useForceSimulation";
import type { PendingDeleteTerminal } from "../app/hooks/useTerminalMutations";
import {
  type TerminalRuntimeStateStore,
  createTerminalRuntimeStateStore,
} from "../app/terminalRuntimeStateStore";
import type { TerminalView, TerminalWorkspaceMode } from "../app/types";
import { DeleteTentacleDialog } from "./DeleteTentacleDialog";
import { CanvasContextMenu } from "./canvas/CanvasContextMenu";
import type { ContextMenuState } from "./canvas/CanvasContextMenu";
import { CanvasTentaclePanel } from "./canvas/CanvasTentaclePanel";
import { CanvasTerminalColumn } from "./canvas/CanvasTerminalColumn";
import { CanvasToolbar } from "./canvas/CanvasToolbar";
import { DeleteAllTerminalsDialog } from "./canvas/DeleteAllTerminalsDialog";
import { OctopusNode } from "./canvas/OctopusNode";
import { SessionNode } from "./canvas/SessionNode";
import { ConsultorOnboarding } from "./consultor/ConsultorOnboarding";
import { ConsultorPropuestaButton } from "./consultor/ConsultorPropuestaButton";
import { WorkspaceSetupCard } from "./deck/WorkspaceSetupCard";

type CanvasPrimaryViewProps = {
  columns: TerminalView;
  runtimeStateStore?: TerminalRuntimeStateStore;
  isUiStateHydrated?: boolean;
  canvasOpenTerminalIds?: string[];
  canvasOpenTentacleIds?: string[];
  canvasTerminalsPanelWidth?: number | null;
  workspaceSetup?: WorkspaceSetupSnapshot | null;
  isWorkspaceSetupLoading?: boolean;
  workspaceSetupError?: string | null;
  runningWorkspaceSetupStepId?: WorkspaceSetupStepId | null;
  onRunWorkspaceSetupStep?: (stepId: WorkspaceSetupStepId) => Promise<void> | void;
  onLaunchWorkspaceSetupPlanner?: () => Promise<string | undefined> | undefined;
  recentlyCreatedTerminal?: TerminalView[number] | null;
  onCanvasOpenTerminalIdsChange?: (ids: string[]) => void;
  onCanvasOpenTentacleIdsChange?: (ids: string[]) => void;
  onCanvasTerminalsPanelWidthChange?: (width: number | null) => void;
  onCreateAgent?: (tentacleId: string) => Promise<string | undefined> | undefined;
  onCreateTerminal?: () => Promise<string | undefined> | undefined;
  onCreateWorktreeTerminal?: () => Promise<string | undefined> | undefined;
  onCreateTentacle?: () => void;
  onSpawnSwarm?: (tentacleId: string, workspaceMode: TerminalWorkspaceMode) => Promise<void>;
  onSolveTodoItem?: (tentacleId: string, itemIndex: number) => Promise<void> | void;
  onOctobossAction?: (action: string) => Promise<string | undefined> | undefined;
  onTentacleAction?: (
    tentacleId: string,
    action: string,
  ) => Promise<string | undefined> | undefined;
  onNavigateToConversation?: (sessionId: string) => void;
  onDeleteActiveSession?: (
    terminalId: string,
    terminalName: string,
    workspaceMode?: string,
  ) => void;
  pendingDeleteTerminal?: PendingDeleteTerminal | null;
  isDeletingTerminalId?: string | null;
  onCancelDelete?: () => void;
  onConfirmDelete?: () => void;
  onTerminalRenamed?: ((terminalId: string, tentacleName: string) => void) | undefined;
  onTerminalActivity?: ((terminalId: string) => void) | undefined;
  onRefreshColumns?: () => Promise<void> | void;
  // Modo Consultor: cuando es false, oculta del grafo cualquier tentacle
  // cuyo nombre no empiece con "consultor-". Se persiste en localStorage
  // del lado del consumidor (App.tsx).
  isShowingNonConsultorTentacles?: boolean;
  // Modo Consultor: cuando es true, oculta los botones de creación
  // (Terminal/Worktree/Tentacle) del toolbar y filtra opciones de
  // context menu sobre los tentáculos consultor-*.
  isConsultorMode?: boolean;
  // Counter externo (App.tsx) que dispara un refresh de la lista de
  // tentáculos del deck. Útil después del bootstrap, que crea tentáculos
  // tras el fetch inicial del hook y necesita forzar recarga.
  externalDeckRefreshTrigger?: number;
};

const CLICK_THRESHOLD = 5;
const GRAPH_MIN_WIDTH = 300;
const TERMINAL_MIN_WIDTH = 370;
const ACTIVE_SESSION_RADIUS = 12;
const buildActiveSessionNodeId = (terminalId: string) => `a:${terminalId}`;
const buildTentacleNodeId = (tentacleId: string) => `t:${tentacleId}`;

const buildCanvasEdgePath = (
  source: GraphNode,
  target: GraphNode,
  edgeIndex: number,
  edgeCount: number,
): string => {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return "";

  const shortenSourceBy = source.radius + 6;
  const shortenTargetBy = target.radius + 6;
  const startRatio = Math.min(1, shortenSourceBy / dist);
  const endRatio = Math.max(0, (dist - shortenTargetBy) / dist);
  const sx = source.x + dx * startRatio;
  const sy = source.y + dy * startRatio;
  const tx = source.x + dx * endRatio;
  const ty = source.y + dy * endRatio;

  const curvature = edgeCount <= 1 ? 0.18 : (edgeIndex / (edgeCount - 1) - 0.5) * 1.2;
  const offsetRatio = edgeCount <= 1 ? 0.16 : 0.18;
  const baseOffset = Math.max(16, Math.min(32, dist * offsetRatio));
  const offsetX = (-dy / dist) * curvature * baseOffset;
  const offsetY = (dx / dist) * curvature * baseOffset;
  const cpx = (sx + tx) / 2 + offsetX;
  const cpy = (sy + ty) / 2 + offsetY;

  return `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`;
};

const isEdgeActivityVisible = (target: GraphNode): boolean =>
  target.type === "active-session" &&
  target.hasUserPrompt !== false &&
  target.agentRuntimeState !== undefined &&
  target.agentRuntimeState !== "idle";

const renderEdgeActivityDots = (path: string, color: string, keyPrefix: string) =>
  [0, 1, 2].flatMap((index) => [
    <circle
      key={`${keyPrefix}-trail-${index}`}
      className="canvas-edge-activity-dot canvas-edge-activity-dot--trail"
      r={4.6}
      fill={color}
      opacity={Math.max(0.14, 0.28 - index * 0.04)}
    >
      <animateMotion
        path={path}
        begin={`${index * 0.62}s`}
        dur="1.9s"
        repeatCount="indefinite"
        rotate="auto"
      />
      <animate
        attributeName="r"
        values="3.8;5.2;3.8"
        dur="1.9s"
        begin={`${index * 0.62}s`}
        repeatCount="indefinite"
      />
    </circle>,
    <circle
      key={`${keyPrefix}-dot-${index}`}
      className="canvas-edge-activity-dot"
      r={3.2}
      fill="#fff4cc"
      stroke={color}
      strokeWidth={1.2}
      opacity={Math.max(0.7, 1 - index * 0.08)}
    >
      <animateMotion
        path={path}
        begin={`${index * 0.62}s`}
        dur="1.9s"
        repeatCount="indefinite"
        rotate="auto"
      />
      <animate
        attributeName="r"
        values="2.8;3.8;2.8"
        dur="1.9s"
        begin={`${index * 0.62}s`}
        repeatCount="indefinite"
      />
    </circle>,
  ]);

export const CanvasPrimaryView = ({
  columns,
  runtimeStateStore: providedRuntimeStateStore,
  isUiStateHydrated,
  canvasOpenTerminalIds,
  canvasOpenTentacleIds,
  canvasTerminalsPanelWidth: persistedTerminalsPanelWidth,
  workspaceSetup = null,
  isWorkspaceSetupLoading = false,
  workspaceSetupError = null,
  runningWorkspaceSetupStepId = null,
  onRunWorkspaceSetupStep,
  onLaunchWorkspaceSetupPlanner,
  recentlyCreatedTerminal,
  onCanvasOpenTerminalIdsChange,
  onCanvasOpenTentacleIdsChange,
  onCanvasTerminalsPanelWidthChange,
  onCreateAgent,
  onCreateTerminal,
  onCreateWorktreeTerminal,
  onCreateTentacle,
  onSpawnSwarm,
  onSolveTodoItem,
  onOctobossAction,
  onTentacleAction,
  onNavigateToConversation,
  onDeleteActiveSession,
  pendingDeleteTerminal,
  isDeletingTerminalId,
  onCancelDelete,
  onConfirmDelete,
  onTerminalRenamed,
  onTerminalActivity,
  onRefreshColumns,
  // Default true: el componente es agnóstico al modo consultor cuando no
  // recibe la prop. App.tsx pasa el valor real (false por defecto) que
  // habilita el filtro del modo consultor BizzGrowth.
  isShowingNonConsultorTentacles = true,
  isConsultorMode = false,
  externalDeckRefreshTrigger = 0,
}: CanvasPrimaryViewProps) => {
  const runtimeStateStoreRef = useRef<TerminalRuntimeStateStore | null>(null);
  if (runtimeStateStoreRef.current === null) {
    runtimeStateStoreRef.current = providedRuntimeStateStore ?? createTerminalRuntimeStateStore();
  }
  const runtimeStateStore = providedRuntimeStateStore ?? runtimeStateStoreRef.current;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [pendingOpenAgentId, setPendingOpenAgentId] = useState<string | null>(null);
  const [hideIdleTerminals, setHideIdleTerminals] = useState(false);
  const [isLaunchingWorkspaceSetupPlanner, setIsLaunchingWorkspaceSetupPlanner] = useState(false);
  const lastHandledCreatedTerminalIdRef = useRef<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const nodeClickedRef = useRef(false);
  const dividerDragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const containerRef = useRef<HTMLElement>(null);
  const terminalsPanelRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef(new Map<string, HTMLElement>());
  const lastFocusedPanelIdRef = useRef<string | null>(null);
  const shouldShowWorkspaceSetupCard = Boolean(workspaceSetup?.shouldShowSetupCard);

  const agentRuntimeStates = useAgentRuntimeStates(runtimeStateStore, columns);

  // Modo Consultor: estado "activo/idle" de cada tentáculo según si su
  // archivo de output existe en el filesystem. Usado para pintar el glow
  // con el color propio de la tool cuando está en uso.
  const consultorActiveTools = useConsultorActiveTools(isConsultorMode);

  const {
    nodes: rawNodes,
    edges: rawEdges,
    tentacleById,
    sessionsByTentacleId,
    refresh: refreshGraphData,
    refreshDeckTentacles,
  } = useCanvasGraphData({ columns, enabled: true, agentRuntimeStates });

  // Modo Consultor: filtra del grafo los tentáculos que no empiezan con
  // "consultor-" cuando isShowingNonConsultorTentacles está apagado.
  // Octoboss y los tentáculos consultor permanecen visibles. Las sesiones
  // hijas de tentáculos ocultos también se filtran. Las aristas que
  // referencian un nodo oculto se eliminan.
  const { nodes, edges } = useMemo(() => {
    if (isShowingNonConsultorTentacles) {
      return { nodes: rawNodes, edges: rawEdges };
    }
    const visibleTentacleIds = new Set<string>();
    for (const node of rawNodes) {
      if (node.type === "octoboss") {
        visibleTentacleIds.add(node.tentacleId);
        continue;
      }
      if (node.type === "tentacle" && node.tentacleId.startsWith("consultor-")) {
        visibleTentacleIds.add(node.tentacleId);
      }
    }
    // Asunción: todos los nodos distintos de "octoboss" tienen tentacleId
    // que apunta a su tentáculo padre (el propio tentáculo y sus sesiones
    // hijas). Si en el futuro se agrega un tipo de nodo que no respete
    // esto, será filtrado silenciosamente y habrá que extender esta regla.
    const filteredNodes = rawNodes.filter(
      (node) => node.type === "octoboss" || visibleTentacleIds.has(node.tentacleId),
    );
    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
    const filteredEdges = rawEdges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [rawNodes, rawEdges, isShowingNonConsultorTentacles]);

  // Refresh externo: cuando App.tsx termina el bootstrap del consultor,
  // los tentáculos recién creados no aparecen porque useCanvasGraphData
  // solo hace fetch al montar. Este effect dispara un refresh manual.
  useEffect(() => {
    if (externalDeckRefreshTrigger > 0) {
      void refreshDeckTentacles();
    }
  }, [externalDeckRefreshTrigger, refreshDeckTentacles]);

  const {
    transform,
    isPanning,
    svgRef,
    handleWheel,
    handlePointerDown: handleCanvasPointerDown,
    handlePointerMove: handleCanvasPointerMove,
    handlePointerUp: handleCanvasPointerUp,
    screenToGraph,
    fitAll,
  } = useCanvasTransform();

  const { simulatedNodes, pinNode, unpinNode, moveNode, reheat } = useForceSimulation({
    nodes,
    edges,
    centerX: 0,
    centerY: 0,
  });

  const nodesById = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of simulatedNodes) {
      map.set(n.id, n);
    }
    return map;
  }, [simulatedNodes]);

  const resolveActiveSessionNode = useCallback(
    (terminalId: string): GraphNode | null => {
      const nodeId = buildActiveSessionNodeId(terminalId);
      const existingNode = nodesById.get(nodeId);
      const terminal = columns.find((entry) => entry.terminalId === terminalId);
      if (!terminal) {
        return existingNode?.type === "active-session" ? existingNode : null;
      }

      const parentNodeId = terminal.parentTerminalId
        ? buildActiveSessionNodeId(terminal.parentTerminalId)
        : buildTentacleNodeId(terminal.tentacleId);
      const anchorNode =
        existingNode?.type === "active-session"
          ? existingNode
          : (nodesById.get(parentNodeId) ??
            nodesById.get(buildTentacleNodeId(terminal.tentacleId)));

      return {
        id: nodeId,
        type: "active-session",
        x: anchorNode?.x ?? 0,
        y: anchorNode?.y ?? 0,
        vx: 0,
        vy: 0,
        pinned: false,
        radius: ACTIVE_SESSION_RADIUS,
        tentacleId: terminal.tentacleId,
        label: terminal.tentacleName || terminal.label || terminal.terminalId,
        color: anchorNode?.color ?? "#c0c0c0",
        sessionId: terminal.terminalId,
        agentState: terminal.state,
        hasUserPrompt: terminal.hasUserPrompt ?? false,
        ...(terminal.workspaceMode ? { workspaceMode: terminal.workspaceMode } : {}),
        ...(terminal.parentTerminalId ? { parentTerminalId: terminal.parentTerminalId } : {}),
      };
    },
    [columns, nodesById],
  );

  const {
    openTerminals,
    setOpenTerminals,
    openTentacles,
    setOpenTentacles,
    terminalsPanelWidth,
    setTerminalsPanelWidth,
    isHydratingTerminals,
    hasHydratedTerminals,
  } = useCanvasPanelHydration({
    isUiStateHydrated,
    canvasOpenTerminalIds,
    canvasOpenTentacleIds,
    persistedTerminalsPanelWidth: persistedTerminalsPanelWidth,
    nodesById,
    simulatedNodes,
    columns,
    onCanvasOpenTerminalIdsChange,
    onCanvasOpenTentacleIdsChange,
    onCanvasTerminalsPanelWidthChange,
  });

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      if (e.button !== 0) return;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setDragNodeId(nodeId);
      pinNode(nodeId);
      svgRef.current?.setPointerCapture(e.pointerId);
    },
    [pinNode, svgRef],
  );

  const handleSvgPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragNodeId) {
        const graphPos = screenToGraph(e.clientX, e.clientY);
        moveNode(dragNodeId, graphPos.x, graphPos.y);
        return;
      }
      handleCanvasPointerMove(e);
    },
    [dragNodeId, screenToGraph, moveNode, handleCanvasPointerMove],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: setState from useState is stable; no need to list in deps
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      const node = nodesById.get(nodeId);
      if (!node) return;

      if (node.type === "active-session") {
        const resolvedNode = node.sessionId
          ? (resolveActiveSessionNode(node.sessionId) ?? node)
          : node;
        setOpenTerminals((prev) => {
          const next = new Map(prev);
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.set(nodeId, { ...resolvedNode });
          }
          return next;
        });
      } else if (node.type === "tentacle" || node.type === "octoboss") {
        // Modo Consultor: los tentáculos consultor-* son indicadores
        // visuales de tools y NO deben abrir un panel propio. Click en
        // el Octoboss SÍ asegura que el chat esté visible en el panel
        // derecho — buscamos el terminal del Octoboss en `columns` y lo
        // agregamos al map de openTerminals si aún no está.
        if (isConsultorMode) {
          if (node.type === "tentacle") {
            return;
          }
          const octobossTerminal = columns.find((c) => c.tentacleId === "__octoboss__");
          if (octobossTerminal) {
            const sessionNodeId = buildActiveSessionNodeId(octobossTerminal.terminalId);
            const sessionNode = nodesById.get(sessionNodeId);
            if (sessionNode && sessionNode.type === "active-session") {
              setOpenTerminals((prev) => {
                if (prev.has(sessionNodeId)) return prev;
                const next = new Map(prev);
                next.set(sessionNodeId, { ...sessionNode });
                return next;
              });
              setSelectedNodeId(sessionNodeId);
            }
          }
          return;
        }
        setOpenTentacles((prev) => {
          const next = new Map(prev);
          if (next.has(nodeId)) {
            next.delete(nodeId);
          } else {
            next.set(nodeId, { ...node });
          }
          return next;
        });
      } else if (node.type === "inactive-session" && node.sessionId) {
        onNavigateToConversation?.(node.sessionId);
      }
    },
    [isConsultorMode, nodesById, onNavigateToConversation, resolveActiveSessionNode],
  );

  const setPanelRef = useCallback(
    (nodeId: string) => (element: HTMLElement | null) => {
      if (element) {
        panelRefs.current.set(nodeId, element);
        return;
      }
      panelRefs.current.delete(nodeId);
    },
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: setState from useState is stable; no need to list in deps
  const handleCloseTentacle = useCallback((nodeId: string) => {
    setOpenTentacles((prev) => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
    setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setState from useState is stable; no need to list in deps
  const handleCloseTerminal = useCallback((nodeId: string) => {
    setOpenTerminals((prev) => {
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
    setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
  }, []);

  // Divider drag handlers
  const handleDividerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Modo Consultor: el chat es una superficie estática, no resizable.
      // Bloqueamos el drag del divider acá y el divider se oculta vía CSS
      // (canvas-divider--locked) para no sugerir afford a interaction.
      if (isConsultorMode) return;
      e.preventDefault();
      // Measure the actual rendered width of the terminals panel (works whether CSS- or inline-sized)
      const panelEl = (e.target as HTMLElement).nextElementSibling as HTMLElement | null;
      const currentWidth = panelEl?.clientWidth ?? terminalsPanelWidth ?? 600;
      dividerDragRef.current = { startX: e.clientX, startWidth: currentWidth };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isConsultorMode, terminalsPanelWidth],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: setState from useState is stable; no need to list in deps
  const handleDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dividerDragRef.current;
    if (!drag) return;
    const containerWidth = containerRef.current?.clientWidth ?? 1200;
    // Dragging left → terminals grow, dragging right → terminals shrink
    const delta = drag.startX - e.clientX;
    const newWidth = Math.max(
      TERMINAL_MIN_WIDTH,
      Math.min(containerWidth - GRAPH_MIN_WIDTH - 6, drag.startWidth + delta),
    );
    setTerminalsPanelWidth(newWidth);
  }, []);

  const handleDividerPointerUp = useCallback(() => {
    dividerDragRef.current = null;
  }, []);

  // Convert vertical wheel to horizontal scroll only when hovering terminal headers
  useEffect(() => {
    if (!isHydratingTerminals && openTerminals.size === 0 && openTentacles.size === 0) return;
    const panel = terminalsPanelRef.current;
    if (!panel) return;
    const handler = (e: WheelEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest(".canvas-terminal-column-header")) return;
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        panel.scrollLeft += e.deltaY;
      }
    };
    panel.addEventListener("wheel", handler, { passive: false });
    return () => panel.removeEventListener("wheel", handler);
  }, [isHydratingTerminals, openTerminals, openTentacles]);

  const handleSvgPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (dragNodeId) {
        const start = dragStartRef.current;
        const dx = start ? e.clientX - start.x : Number.POSITIVE_INFINITY;
        const dy = start ? e.clientY - start.y : Number.POSITIVE_INFINITY;
        const wasClick = Math.abs(dx) < CLICK_THRESHOLD && Math.abs(dy) < CLICK_THRESHOLD;

        unpinNode(dragNodeId);
        reheat();

        if (wasClick) {
          nodeClickedRef.current = true;
          handleNodeClick(dragNodeId);
        }

        setDragNodeId(null);
        dragStartRef.current = null;
        return;
      }
      handleCanvasPointerUp(e);
    },
    [dragNodeId, unpinNode, reheat, handleCanvasPointerUp, handleNodeClick],
  );

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (nodeClickedRef.current) {
      nodeClickedRef.current = false;
      return;
    }
    if (e.target === e.currentTarget) {
      setSelectedNodeId(null);
    }
  }, []);

  // Stable ref for nodesById so native listener always sees latest data
  const nodesByIdRef = useRef(nodesById);
  nodesByIdRef.current = nodesById;

  // Stable refs so the native listener always sees the latest callbacks
  const onNavigateRef = useRef(onNavigateToConversation);
  onNavigateRef.current = onNavigateToConversation;

  // Native contextmenu listener — must be native to reliably preventDefault
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handler = (e: MouseEvent) => {
      let el = e.target as Element | null;
      let nodeId: string | null = null;
      while (el && el !== svg) {
        const id = el.getAttribute("data-node-id");
        if (id) {
          nodeId = id;
          break;
        }
        el = el.parentElement;
      }
      if (!nodeId) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ kind: "canvas", x: e.clientX, y: e.clientY });
        return;
      }
      const node = nodesByIdRef.current.get(nodeId);
      if (!node) return;

      if (node.type === "octoboss") {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ kind: "octoboss", x: e.clientX, y: e.clientY });
        return;
      }

      if (node.type === "tentacle") {
        e.preventDefault();
        e.stopPropagation();
        // Modo Consultor: en los 4 tentáculos consultor-* el operador no
        // crea agentes ni dispara swarms — solo conversa con el Octoboss.
        // No abrimos el menú para evitar mostrar opciones que no aplican.
        if (isConsultorMode && node.tentacleId.startsWith("consultor-")) {
          return;
        }
        setContextMenu({
          kind: "tentacle",
          x: e.clientX,
          y: e.clientY,
          tentacleId: node.tentacleId,
        });
        return;
      }

      if (node.type === "inactive-session" && node.sessionId) {
        e.preventDefault();
        e.stopPropagation();
        onNavigateRef.current?.(node.sessionId);
        return;
      }

      if (node.type === "active-session" && node.sessionId) {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
          kind: "active-session",
          x: e.clientX,
          y: e.clientY,
          nodeId: node.id,
          tentacleId: node.tentacleId,
          sessionId: node.sessionId,
          label: node.label,
          ...(node.workspaceMode ? { workspaceMode: node.workspaceMode } : {}),
        });
      }
    };

    svg.addEventListener("contextmenu", handler);
    return () => svg.removeEventListener("contextmenu", handler);
  }, [svgRef, isConsultorMode]);

  const handleCreateAgent = useCallback(
    (tentacleId: string) => {
      if (!onCreateAgent) return;
      setContextMenu(null);
      const result = onCreateAgent(tentacleId);
      if (result && typeof result.then === "function") {
        void result.then((agentId) => {
          if (agentId) setPendingOpenAgentId(agentId);
        });
      }
    },
    [onCreateAgent],
  );

  const handleSpawnSwarm = useCallback(
    (tentacleId: string, workspaceMode: TerminalWorkspaceMode) => {
      setContextMenu(null);
      void onSpawnSwarm?.(tentacleId, workspaceMode);
    },
    [onSpawnSwarm],
  );

  const handleOctobossAction = useCallback(
    (action: string) => {
      setContextMenu(null);
      const result = onOctobossAction?.(action);
      if (result && typeof result.then === "function") {
        void result.then((agentId) => {
          if (agentId) setPendingOpenAgentId(agentId);
        });
      }
    },
    [onOctobossAction],
  );

  const handleTentacleAction = useCallback(
    (tentacleId: string, action: string) => {
      setContextMenu(null);
      const result = onTentacleAction?.(tentacleId, action);
      if (result && typeof result.then === "function") {
        void result.then((agentId) => {
          if (agentId) setPendingOpenAgentId(agentId);
        });
      }
    },
    [onTentacleAction],
  );

  // Auto-open terminal for newly created agent once it appears in the graph
  // biome-ignore lint/correctness/useExhaustiveDependencies: setState from useState is stable; no need to list in deps
  useEffect(() => {
    if (!pendingOpenAgentId) return;
    const nodeId = buildActiveSessionNodeId(pendingOpenAgentId);
    const node = resolveActiveSessionNode(pendingOpenAgentId);
    if (!node) return;
    setPendingOpenAgentId(null);
    setSelectedNodeId(nodeId);
    setOpenTerminals((prev) => {
      const next = new Map(prev);
      next.set(nodeId, { ...node });
      return next;
    });
  }, [pendingOpenAgentId, resolveActiveSessionNode]);

  // Modo Consultor: el chat del Octoboss debe estar SIEMPRE visible en
  // el panel derecho (UX tipo Claude Desktop, una sola pestaña). Abre
  // automáticamente el primer terminal cuyo tentacleId === OCTOBOSS_ID
  // en cuanto aparezca en `columns`. Idempotente: no reabre si ya está
  // en openTerminals, y no cierra si el operador lo cerró manualmente
  // (el efecto solo agrega).
  // biome-ignore lint/correctness/useExhaustiveDependencies: setOpenTerminals/setSelectedNodeId son estables; nodesById se actualiza en cada render con simulatedNodes
  useEffect(() => {
    if (!isConsultorMode || !isUiStateHydrated) return;
    const octobossTerminal = columns.find((c) => c.tentacleId === "__octoboss__");
    if (!octobossTerminal) return;
    const sessionNodeId = buildActiveSessionNodeId(octobossTerminal.terminalId);
    const sessionNode = nodesById.get(sessionNodeId);
    if (!sessionNode || sessionNode.type !== "active-session") return;
    setOpenTerminals((prev) => {
      if (prev.has(sessionNodeId)) return prev;
      const next = new Map(prev);
      next.set(sessionNodeId, { ...sessionNode });
      return next;
    });
  }, [isConsultorMode, isUiStateHydrated, columns, nodesById]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: setState from useState is stable; no need to list in deps
  useEffect(() => {
    if (!isUiStateHydrated || !recentlyCreatedTerminal) {
      return;
    }
    if (lastHandledCreatedTerminalIdRef.current === recentlyCreatedTerminal.terminalId) {
      return;
    }
    if (!recentlyCreatedTerminal.parentTerminalId) {
      lastHandledCreatedTerminalIdRef.current = recentlyCreatedTerminal.terminalId;
      return;
    }
    if (!openTerminals.has(buildActiveSessionNodeId(recentlyCreatedTerminal.parentTerminalId))) {
      lastHandledCreatedTerminalIdRef.current = recentlyCreatedTerminal.terminalId;
      return;
    }

    const nodeId = buildActiveSessionNodeId(recentlyCreatedTerminal.terminalId);
    const node = resolveActiveSessionNode(recentlyCreatedTerminal.terminalId);
    if (!node) {
      return;
    }

    lastHandledCreatedTerminalIdRef.current = recentlyCreatedTerminal.terminalId;
    setSelectedNodeId(nodeId);
    setOpenTerminals((prev) => {
      const next = new Map(prev);
      next.set(nodeId, { ...node });
      return next;
    });
  }, [isUiStateHydrated, openTerminals, recentlyCreatedTerminal, resolveActiveSessionNode]);

  useEffect(() => {
    if (!selectedNodeId) {
      lastFocusedPanelIdRef.current = null;
      return;
    }
    if (!openTerminals.has(selectedNodeId) && !openTentacles.has(selectedNodeId)) {
      if (lastFocusedPanelIdRef.current === selectedNodeId) {
        lastFocusedPanelIdRef.current = null;
      }
      return;
    }
    if (lastFocusedPanelIdRef.current === selectedNodeId) {
      return;
    }

    const panel = panelRefs.current.get(selectedNodeId);
    if (!panel) {
      return;
    }

    lastFocusedPanelIdRef.current = selectedNodeId;
    const rafId = window.requestAnimationFrame(() => {
      panel.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
      panel.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [selectedNodeId, openTerminals, openTentacles]);

  // Separate tentacle and session nodes for render order
  const tentacleNodes = simulatedNodes.filter(
    (n) => n.type === "tentacle" || n.type === "octoboss",
  );
  const sessionNodes = simulatedNodes.filter((n) => {
    if (n.type === "tentacle" || n.type === "octoboss") return false;
    if (hideIdleTerminals && n.type === "inactive-session") return false;
    if (
      hideIdleTerminals &&
      n.type === "active-session" &&
      (n.agentState === "idle" || n.hasUserPrompt === false)
    )
      return false;
    return true;
  });

  const handleFitView = useCallback(() => {
    fitAll(simulatedNodes);
  }, [fitAll, simulatedNodes]);

  const handleRefresh = useCallback(() => {
    if (onRefreshColumns) {
      const result = onRefreshColumns();
      if (result && typeof result.then === "function") {
        void result.finally(() => {
          refreshGraphData();
        });
        return;
      }
    }
    refreshGraphData();
  }, [onRefreshColumns, refreshGraphData]);

  const waitingNodes = simulatedNodes.filter(
    (n) =>
      n.type === "active-session" &&
      (n.agentRuntimeState === "waiting_for_permission" ||
        n.agentRuntimeState === "waiting_for_user"),
  );

  const { sessionEdges, sessionEdgesBySource } = buildSessionEdgeGroups(
    edges,
    nodesById,
    hideIdleTerminals,
  );

  const hasPanels = isHydratingTerminals || openTerminals.size > 0 || openTentacles.size > 0;
  const terminalLayoutVersion = useMemo(() => {
    const openIds = Array.from(openTerminals.keys()).join("|");
    return `${openIds}::${terminalsPanelWidth ?? "auto"}`;
  }, [openTerminals, terminalsPanelWidth]);
  const handleLaunchWorkspaceSetupPlanner = useCallback(async () => {
    if (!onLaunchWorkspaceSetupPlanner) {
      return;
    }

    setIsLaunchingWorkspaceSetupPlanner(true);
    try {
      const agentId = await onLaunchWorkspaceSetupPlanner();
      if (agentId) {
        setPendingOpenAgentId(agentId);
      }
    } finally {
      setIsLaunchingWorkspaceSetupPlanner(false);
    }
  }, [onLaunchWorkspaceSetupPlanner]);

  return (
    <section ref={containerRef} className="canvas-view" aria-label="Canvas graph view">
      <div className={`canvas-graph-panel${hasPanels ? " canvas-graph-panel--split" : ""}`}>
        <svg
          aria-label="Canvas graph"
          ref={svgRef}
          className={`canvas-svg${isPanning || dragNodeId ? " canvas-svg--panning" : ""}`}
          onWheel={handleWheel}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onClick={handleSvgClick}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setContextMenu(null);
              setSelectedNodeId(null);
              return;
            }
            if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
              e.preventDefault();
              setSelectedNodeId(null);
            }
          }}
        >
          <title>Canvas graph</title>
          <g
            transform={`translate(${transform.translateX}, ${transform.translateY}) scale(${transform.scale})`}
          >
            {Array.from(sessionEdgesBySource.entries()).flatMap(([sourceId, group]) =>
              group.map(({ source, target }, index) => {
                const active = selectedNodeId === source.id || selectedNodeId === target.id;
                const selectedColor = selectedNodeId
                  ? (nodesById.get(selectedNodeId)?.color ?? null)
                  : null;
                const path = buildCanvasEdgePath(source, target, index, group.length);

                return (
                  <g key={`${sourceId}->${target.id}`}>
                    <path
                      className="canvas-edge"
                      d={path}
                      fill="none"
                      stroke={active ? (selectedColor ?? source.color) : "#C0C0C0"}
                      strokeWidth={active ? 2 : 1.5}
                      strokeOpacity={1}
                    />
                    {isEdgeActivityVisible(target)
                      ? renderEdgeActivityDots(
                          path,
                          active ? (selectedColor ?? source.color) : source.color,
                          `${sourceId}->${target.id}`,
                        )
                      : null}
                  </g>
                );
              }),
            )}

            {/* Render tentacle nodes (with arms) first */}
            {tentacleNodes.map((node) => {
              const connected = edges
                .filter((e) => e.source === node.id)
                .map((e) => nodesById.get(e.target))
                .filter((n): n is GraphNode => {
                  if (!n) return false;
                  if (hideIdleTerminals && n.type === "inactive-session") return false;
                  if (
                    hideIdleTerminals &&
                    n.type === "active-session" &&
                    (n.agentState === "idle" || n.hasUserPrompt === false)
                  )
                    return false;
                  return true;
                });

              const selectedColor = selectedNodeId
                ? (nodesById.get(selectedNodeId)?.color ?? null)
                : null;

              const toolState =
                node.type === "tentacle" && node.tentacleId.startsWith("consultor-")
                  ? (consultorActiveTools.get(node.tentacleId) ?? "idle")
                  : undefined;
              return (
                <OctopusNode
                  key={node.id}
                  node={node}
                  connectedNodes={connected}
                  isSelected={selectedNodeId === node.id}
                  selectedNodeId={selectedNodeId}
                  selectedNodeColor={selectedColor}
                  consultorToolState={toolState}
                  onPointerDown={handleNodePointerDown}
                  onClick={handleNodeClick}
                />
              );
            })}

            {/* Render session nodes on top */}
            {sessionNodes.map((node) => (
              <SessionNode
                key={node.id}
                node={node}
                isSelected={selectedNodeId === node.id}
                onPointerDown={handleNodePointerDown}
                onClick={handleNodeClick}
              />
            ))}
          </g>
        </svg>

        {/* Canvas toolbar — top-left action buttons */}
        <CanvasToolbar
          isConsultorMode={isConsultorMode}
          hideIdleTerminals={hideIdleTerminals}
          onCreateTerminal={onCreateTerminal}
          onCreateWorktreeTerminal={onCreateWorktreeTerminal}
          onCreateTentacle={onCreateTentacle}
          onFitView={handleFitView}
          onRefresh={handleRefresh}
          onToggleHideIdle={() => setHideIdleTerminals((prev) => !prev)}
          onDeleteAll={() => setIsDeleteAllDialogOpen(true)}
          onPendingOpenAgentId={(agentId) => setPendingOpenAgentId(agentId)}
        />

        {/* Waiting notifications — compact bars below the toolbar */}
        {waitingNodes.length > 0 && (
          <div className="canvas-waiting-list">
            {waitingNodes.map((node) => {
              const nameRaw = node.label;
              const name = nameRaw.length > 20 ? `${nameRaw.slice(0, 20)}…` : nameRaw;
              const prefix =
                node.agentRuntimeState === "waiting_for_permission"
                  ? `${node.waitingToolName ?? "Permission"}: `
                  : "Waiting: ";
              return (
                <button
                  key={node.id}
                  type="button"
                  className="canvas-waiting-bar"
                  onClick={() => handleNodeClick(node.id)}
                >
                  <span className="canvas-waiting-bar-name">
                    <span className="canvas-waiting-bar-prefix">{prefix}</span>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {shouldShowWorkspaceSetupCard && (
          <div className="canvas-setup-overlay">
            <WorkspaceSetupCard
              workspaceSetup={workspaceSetup}
              isLoading={isWorkspaceSetupLoading}
              error={workspaceSetupError}
              onRunStep={(stepId) => {
                void onRunWorkspaceSetupStep?.(stepId);
              }}
              onLaunchClaudeCode={() => {
                void handleLaunchWorkspaceSetupPlanner();
              }}
              isLaunchingAgent={isLaunchingWorkspaceSetupPlanner}
              isRunningStepId={runningWorkspaceSetupStepId}
            />
          </div>
        )}
      </div>

      {hasPanels && (
        <>
          <div
            className={`canvas-panel-divider${isConsultorMode ? " canvas-panel-divider--locked" : ""}`}
            role="separator"
            aria-orientation="vertical"
            tabIndex={isConsultorMode ? -1 : 0}
            onPointerDown={handleDividerPointerDown}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
          />
          <div
            ref={terminalsPanelRef}
            className="canvas-terminals-panel"
            style={
              terminalsPanelWidth != null ? { flex: `0 0 ${terminalsPanelWidth}px` } : undefined
            }
          >
            {isConsultorMode ? (
              <ConsultorOnboarding
                isFirstRun={
                  // Primera vez si las 4 tools están idle: ningún archivo
                  // de output existe todavía. Una vez que cualquier tool
                  // pasa a done/current, se asume que ya entró en flujo.
                  consultorActiveTools.size === 0 ||
                  Array.from(consultorActiveTools.values()).every((s) => s === "idle")
                }
              />
            ) : null}
            {isConsultorMode ? (
              <ConsultorPropuestaButton
                isActive={
                  // El botón de descarga aparece tanto en "current" (recién
                  // generada) como en "done" (ya escrita y persistente).
                  // Sin archivo (idle) no hay nada que descargar.
                  consultorActiveTools.get("consultor-comercial") !== undefined &&
                  consultorActiveTools.get("consultor-comercial") !== "idle"
                }
                onReset={() => {
                  // Reset = borrar archivos (ya hecho por el botón) + matar
                  // el terminal del Octoboss (su orquestador tiene memoria
                  // del prospecto anterior y debe arrancar fresco) + recargar
                  // para que el bootstrap recree todo limpio.
                  const octobossTerminal = columns.find((c) => c.tentacleId === "__octoboss__");
                  if (octobossTerminal) {
                    onDeleteActiveSession?.(
                      octobossTerminal.terminalId,
                      octobossTerminal.tentacleName ?? "Octoboss",
                      octobossTerminal.workspaceMode,
                    );
                  }
                  // Pequeña espera para que el DELETE se procese antes del
                  // reload; si falla, el reload igual reseteará la UI y el
                  // bootstrap lo intentará de nuevo.
                  window.setTimeout(() => window.location.reload(), 600);
                }}
              />
            ) : null}
            {Array.from(openTentacles.entries()).map(([nodeId, node]) => {
              return (
                <CanvasTentaclePanel
                  key={nodeId}
                  node={node}
                  isFocused={selectedNodeId === nodeId}
                  panelRef={setPanelRef(nodeId)}
                  tentacle={tentacleById.get(node.tentacleId) ?? null}
                  sessions={sessionsByTentacleId.get(node.tentacleId) ?? []}
                  onClose={() => handleCloseTentacle(nodeId)}
                  onFocus={() => setSelectedNodeId(nodeId)}
                  onCreateAgent={(tentacleId) => {
                    handleCreateAgent(tentacleId);
                  }}
                  onSolveTodoItem={(tentacleId, itemIndex) => {
                    void onSolveTodoItem?.(tentacleId, itemIndex);
                  }}
                  onSpawnSwarm={(tentacleId, workspaceMode) => {
                    handleSpawnSwarm(tentacleId, workspaceMode);
                  }}
                  onNavigateToConversation={onNavigateToConversation}
                  onRefreshTentacleData={refreshDeckTentacles}
                />
              );
            })}
            {isHydratingTerminals && openTerminals.size === 0 && (
              <div className="canvas-terminal-skeleton">
                <div className="canvas-terminal-skeleton__header" />
                <div className="canvas-terminal-skeleton__body">
                  <div className="canvas-terminal-skeleton__line" style={{ width: "60%" }} />
                  <div className="canvas-terminal-skeleton__line" style={{ width: "80%" }} />
                  <div className="canvas-terminal-skeleton__line" style={{ width: "45%" }} />
                </div>
              </div>
            )}
            {Array.from(openTerminals.entries()).map(([nodeId, node]) => (
              <CanvasTerminalColumn
                key={nodeId}
                node={node}
                terminals={columns}
                layoutVersion={terminalLayoutVersion}
                isFocused={selectedNodeId === nodeId}
                panelRef={setPanelRef(nodeId)}
                onClose={() => handleCloseTerminal(nodeId)}
                onFocus={() => setSelectedNodeId(nodeId)}
                onTerminalRenamed={onTerminalRenamed}
                onTerminalActivity={onTerminalActivity}
              />
            ))}
          </div>
        </>
      )}

      {/* Context menu */}
      {contextMenu && (
        <CanvasContextMenu
          contextMenu={contextMenu}
          onClose={() => setContextMenu(null)}
          onCreateTentacle={onCreateTentacle}
          onCreateTerminal={onCreateTerminal}
          onCreateWorktreeTerminal={onCreateWorktreeTerminal}
          onCreateAgent={handleCreateAgent}
          onTentacleAction={handleTentacleAction}
          onSpawnSwarm={handleSpawnSwarm}
          onOctobossAction={handleOctobossAction}
          onDeleteActiveSession={onDeleteActiveSession}
          onPendingOpenAgentId={(agentId) => setPendingOpenAgentId(agentId)}
        />
      )}

      {pendingDeleteTerminal && onCancelDelete && onConfirmDelete && (
        <div className="canvas-delete-dialog">
          <DeleteTentacleDialog
            pendingDeleteTerminal={pendingDeleteTerminal}
            isDeletingTerminalId={isDeletingTerminalId ?? null}
            onCancel={onCancelDelete}
            onConfirmDelete={onConfirmDelete}
          />
        </div>
      )}

      {isDeleteAllDialogOpen && (
        <div className="canvas-delete-dialog">
          <DeleteAllTerminalsDialog
            columns={columns}
            nodes={nodes}
            onCancel={() => setIsDeleteAllDialogOpen(false)}
            onDeleted={({ hadFailures }) => {
              if (!hadFailures) {
                setIsDeleteAllDialogOpen(false);
              }
              setOpenTerminals(new Map());
              void onRefreshColumns?.();
              refreshGraphData();
            }}
          />
        </div>
      )}
    </section>
  );
};
