import {
  GitBranch,
  Hexagon,
  Layers,
  ListTodo,
  Sparkles,
  Terminal as TerminalIcon,
  Trash2,
} from "lucide-react";

import type { TerminalWorkspaceMode } from "../../app/types";

export type ContextMenuState =
  | { kind: "canvas"; x: number; y: number }
  | { kind: "tentacle"; x: number; y: number; tentacleId: string }
  | { kind: "octoboss"; x: number; y: number }
  | {
      kind: "active-session";
      x: number;
      y: number;
      nodeId: string;
      tentacleId: string;
      sessionId: string;
      label: string;
      workspaceMode?: string;
    };

type CanvasContextMenuProps = {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onCreateTentacle?: (() => void) | undefined;
  onCreateTerminal?: (() => Promise<string | undefined> | undefined) | undefined;
  onCreateWorktreeTerminal?: (() => Promise<string | undefined> | undefined) | undefined;
  onCreateAgent: (tentacleId: string) => void;
  onTentacleAction: (tentacleId: string, action: string) => void;
  onSpawnSwarm: (tentacleId: string, workspaceMode: TerminalWorkspaceMode) => void;
  onOctobossAction: (action: string) => void;
  onDeleteActiveSession?:
    | ((sessionId: string, label: string, workspaceMode?: string) => void)
    | undefined;
  onPendingOpenAgentId: (agentId: string) => void;
};

export const CanvasContextMenu = ({
  contextMenu,
  onClose,
  onCreateTentacle,
  onCreateTerminal,
  onCreateWorktreeTerminal,
  onCreateAgent,
  onTentacleAction,
  onSpawnSwarm,
  onOctobossAction,
  onDeleteActiveSession,
  onPendingOpenAgentId,
}: CanvasContextMenuProps) => {
  const redispatchContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    // Use rAF so the backdrop is removed before we probe elementFromPoint
    requestAnimationFrame(() => {
      const under = document.elementFromPoint(e.clientX, e.clientY);
      if (under) {
        under.dispatchEvent(
          new MouseEvent("contextmenu", {
            bubbles: true,
            clientX: e.clientX,
            clientY: e.clientY,
          }),
        );
      }
    });
  };

  return (
    <>
      <div
        aria-label="Close canvas context menu"
        className="canvas-context-menu-backdrop"
        onClick={onClose}
        onContextMenu={redispatchContextMenu}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " " && e.key !== "Escape") return;
          e.preventDefault();
          onClose();
        }}
        role="button"
        tabIndex={0}
      />
      <div
        className="canvas-context-menu"
        style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        onContextMenu={redispatchContextMenu}
      >
        {contextMenu.kind === "canvas" && (
          <>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => {
                onClose();
                onCreateTentacle?.();
              }}
            >
              <span className="canvas-context-menu-icon">
                <Hexagon size={14} />
              </span>
              New Tentacle
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => {
                onClose();
                const result = onCreateTerminal?.();
                if (result && typeof result.then === "function") {
                  void result.then((agentId) => {
                    if (agentId) onPendingOpenAgentId(agentId);
                  });
                }
              }}
            >
              <span className="canvas-context-menu-icon">
                <TerminalIcon size={14} />
              </span>
              New Terminal
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => {
                onClose();
                const result = onCreateWorktreeTerminal?.();
                if (result && typeof result.then === "function") {
                  void result.then((agentId) => {
                    if (agentId) onPendingOpenAgentId(agentId);
                  });
                }
              }}
            >
              <span className="canvas-context-menu-icon">
                <GitBranch size={14} />
              </span>
              New Worktree Terminal
            </button>
          </>
        )}
        {contextMenu.kind === "tentacle" && (
          <>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => onCreateAgent(contextMenu.tentacleId)}
            >
              <span className="canvas-context-menu-icon">
                <TerminalIcon size={14} />
              </span>
              Create new agent
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => {
                onClose();
                const result = onCreateWorktreeTerminal?.();
                if (result && typeof result.then === "function") {
                  void result.then((agentId) => {
                    if (agentId) onPendingOpenAgentId(agentId);
                  });
                }
              }}
            >
              <span className="canvas-context-menu-icon">
                <GitBranch size={14} />
              </span>
              New Worktree Terminal
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => onTentacleAction(contextMenu.tentacleId, "tentacle-reorganize-todos")}
            >
              <span className="canvas-context-menu-icon">
                <ListTodo size={14} />
              </span>
              Update To-Do List
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => onTentacleAction(contextMenu.tentacleId, "tentacle-update-tentacle")}
            >
              <span className="canvas-context-menu-icon">
                <Hexagon size={14} />
              </span>
              Update Tentacle
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => onSpawnSwarm(contextMenu.tentacleId, "worktree")}
            >
              <span className="canvas-context-menu-icon">
                <Layers size={14} />
              </span>
              Spawn Swarm (Worktrees)
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => onSpawnSwarm(contextMenu.tentacleId, "shared")}
            >
              <span className="canvas-context-menu-icon">
                <Layers size={14} />
              </span>
              Spawn Swarm (Normal)
            </button>
          </>
        )}
        {contextMenu.kind === "octoboss" && (
          <>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => onOctobossAction("octoboss-reorganize-todos")}
            >
              <span className="canvas-context-menu-icon">
                <ListTodo size={14} />
              </span>
              Reorganize To-Do's
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => onOctobossAction("octoboss-reorganize-tentacles")}
            >
              <span className="canvas-context-menu-icon">
                <Hexagon size={14} />
              </span>
              Reorganize Tentacles
            </button>
            <button
              type="button"
              className="canvas-context-menu-item"
              onClick={() => onOctobossAction("octoboss-clean-contexts")}
            >
              <span className="canvas-context-menu-icon">
                <Sparkles size={14} />
              </span>
              Clean Tentacle Contexts
            </button>
          </>
        )}
        {contextMenu.kind === "active-session" && (
          <button
            type="button"
            className="canvas-context-menu-item canvas-context-menu-item--danger"
            onClick={() => {
              onDeleteActiveSession?.(
                contextMenu.sessionId,
                contextMenu.label,
                contextMenu.workspaceMode,
              );
              onClose();
            }}
          >
            <span className="canvas-context-menu-icon">
              <Trash2 size={14} />
            </span>
            Delete
          </button>
        )}
      </div>
    </>
  );
};
