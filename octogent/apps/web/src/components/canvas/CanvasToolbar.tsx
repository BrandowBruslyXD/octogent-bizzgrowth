import {
  GitBranch,
  Hexagon,
  Maximize,
  Pause,
  Play,
  RefreshCw,
  Terminal as TerminalIcon,
  Trash2,
} from "lucide-react";

type CanvasToolbarProps = {
  // Modo Consultor: cuando es true, oculta los botones Terminal/Worktree/Tentacle.
  isConsultorMode: boolean;
  hideIdleTerminals: boolean;
  onCreateTerminal?: (() => Promise<string | undefined> | undefined) | undefined;
  onCreateWorktreeTerminal?: (() => Promise<string | undefined> | undefined) | undefined;
  onCreateTentacle?: (() => void) | undefined;
  onFitView: () => void;
  onRefresh: () => void;
  onToggleHideIdle: () => void;
  onDeleteAll: () => void;
  onPendingOpenAgentId: (agentId: string) => void;
};

export const CanvasToolbar = ({
  isConsultorMode,
  hideIdleTerminals,
  onCreateTerminal,
  onCreateWorktreeTerminal,
  onCreateTentacle,
  onFitView,
  onRefresh,
  onToggleHideIdle,
  onDeleteAll,
  onPendingOpenAgentId,
}: CanvasToolbarProps) => {
  return (
    <div className="canvas-toolbar" role="toolbar" aria-label="Canvas actions">
      {!isConsultorMode && (
        <>
          <button
            type="button"
            className="canvas-toolbar-btn"
            onClick={() => {
              const result = onCreateTerminal?.();
              if (result && typeof result.then === "function") {
                void result.then((agentId) => {
                  if (agentId) onPendingOpenAgentId(agentId);
                });
              }
            }}
          >
            <span className="canvas-toolbar-icon">
              <TerminalIcon size={14} />
            </span>
            <span className="canvas-toolbar-label">Terminal</span>
          </button>
          <button
            type="button"
            className="canvas-toolbar-btn"
            onClick={() => {
              const result = onCreateWorktreeTerminal?.();
              if (result && typeof result.then === "function") {
                void result.then((agentId) => {
                  if (agentId) onPendingOpenAgentId(agentId);
                });
              }
            }}
          >
            <span className="canvas-toolbar-icon">
              <GitBranch size={14} />
            </span>
            <span className="canvas-toolbar-label">Worktree</span>
          </button>
          <button type="button" className="canvas-toolbar-btn" onClick={onCreateTentacle}>
            <span className="canvas-toolbar-icon">
              <Hexagon size={14} />
            </span>
            <span className="canvas-toolbar-label">Tentacle</span>
          </button>
          <div className="canvas-toolbar-separator" />
        </>
      )}
      <button type="button" className="canvas-toolbar-btn" onClick={onFitView}>
        <span className="canvas-toolbar-icon">
          <Maximize size={14} />
        </span>
        <span className="canvas-toolbar-label">Fit</span>
      </button>
      <button type="button" className="canvas-toolbar-btn" onClick={onRefresh}>
        <span className="canvas-toolbar-icon">
          <RefreshCw size={14} />
        </span>
        <span className="canvas-toolbar-label">Refresh</span>
      </button>
      <div className="canvas-toolbar-separator" />
      <button
        type="button"
        className={`canvas-toolbar-btn${hideIdleTerminals ? " canvas-toolbar-btn--active" : ""}`}
        onClick={onToggleHideIdle}
      >
        <span className="canvas-toolbar-icon">
          {hideIdleTerminals ? <Play size={14} /> : <Pause size={14} />}
        </span>
        <span className="canvas-toolbar-label">
          {hideIdleTerminals ? "Show Idle" : "Hide Idle"}
        </span>
      </button>
      <div className="canvas-toolbar-separator" />
      <button
        type="button"
        className="canvas-toolbar-btn canvas-toolbar-btn--danger"
        onClick={onDeleteAll}
      >
        <span className="canvas-toolbar-icon">
          <Trash2 size={14} />
        </span>
        <span className="canvas-toolbar-label">Delete All</span>
      </button>
    </div>
  );
};
