import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";

import {
  buildDeckTentacleSwarmUrl,
  buildDeckTentaclesUrl,
  buildTerminalsUrl,
} from "../../runtime/runtimeEndpoints";
import type { PrimaryNavIndex } from "../constants";
import type { TerminalAgentProvider, TerminalWorkspaceMode } from "../types";
import { OCTOBOSS_ID } from "./useCanvasGraphData";

type CreateTerminalFn = (
  workspaceMode: TerminalWorkspaceMode,
  agentProvider?: TerminalAgentProvider,
  tentacleId?: string,
) => Promise<string | undefined>;

type RequestDeleteTerminalFn = (
  terminalId: string,
  terminalName: string,
  options?: {
    workspaceMode?: TerminalWorkspaceMode;
    intent?: "delete-terminal" | "cleanup-worktree";
  },
) => void;

interface UseCanvasActionsOptions {
  refreshColumns: () => Promise<unknown>;
  createTerminal: CreateTerminalFn;
  requestDeleteTerminal: RequestDeleteTerminalFn;
  clearPendingDeleteTerminal: () => void;
  confirmDeleteTerminal: () => Promise<void>;
  setActivePrimaryNav: Dispatch<SetStateAction<PrimaryNavIndex>>;
}

interface CanvasActions {
  onLaunchWorkspaceSetupPlanner: () => Promise<string | undefined>;
  onCreateAgent: (tentacleId: string) => Promise<string | undefined>;
  onCreateTerminal: () => Promise<string | undefined>;
  onCreateWorktreeTerminal: () => Promise<string | undefined>;
  onCreateTentacle: () => Promise<void>;
  onSpawnSwarm: (tentacleId: string, workspaceMode: TerminalWorkspaceMode) => Promise<void>;
  onOctobossAction: (action: string) => Promise<string | undefined>;
  onTentacleAction: (tentacleId: string, action: string) => Promise<string | undefined>;
  onNavigateToConversation: (sessionId: string) => void;
  onDeleteActiveSession: (terminalId: string, terminalName: string, workspaceMode?: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onRefreshColumns: () => Promise<void>;
}

export const useCanvasActions = ({
  refreshColumns,
  createTerminal,
  requestDeleteTerminal,
  clearPendingDeleteTerminal,
  confirmDeleteTerminal,
  setActivePrimaryNav,
}: UseCanvasActionsOptions): CanvasActions => {
  const onLaunchWorkspaceSetupPlanner = useCallback(async (): Promise<string | undefined> => {
    const response = await fetch(buildTerminalsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "tentacle-planner",
        workspaceMode: "shared",
        agentProvider: "claude-code",
        promptTemplate: "tentacle-planner",
      }),
    });
    if (!response.ok) {
      return undefined;
    }
    const snapshot = (await response.json()) as { terminalId?: string };
    await refreshColumns();
    if (typeof snapshot.terminalId !== "string") {
      return undefined;
    }
    return snapshot.terminalId;
  }, [refreshColumns]);

  const onCreateAgent = useCallback(
    async (tentacleId: string): Promise<string | undefined> => {
      return await createTerminal("shared", undefined, tentacleId);
    },
    [createTerminal],
  );

  const onCreateTerminal = useCallback(async (): Promise<string | undefined> => {
    return await createTerminal("shared", undefined, OCTOBOSS_ID);
  }, [createTerminal]);

  const onCreateWorktreeTerminal = useCallback(async (): Promise<string | undefined> => {
    return await createTerminal("worktree", undefined, OCTOBOSS_ID);
  }, [createTerminal]);

  const onCreateTentacle = useCallback(async (): Promise<void> => {
    const response = await fetch(buildDeckTentaclesUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", description: "" }),
    });
    if (!response.ok) return;
    await refreshColumns();
  }, [refreshColumns]);

  const onSpawnSwarm = useCallback(
    async (tentacleId: string, workspaceMode: TerminalWorkspaceMode): Promise<void> => {
      const response = await fetch(buildDeckTentacleSwarmUrl(tentacleId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceMode }),
      });
      if (!response.ok) return;
    },
    [],
  );

  const onOctobossAction = useCallback(
    async (action: string): Promise<string | undefined> => {
      const response = await fetch(buildTerminalsUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceMode: "shared",
          tentacleId: OCTOBOSS_ID,
          promptTemplate: action,
        }),
      });
      if (!response.ok) return undefined;
      const snapshot = (await response.json()) as { terminalId?: string };
      await refreshColumns();
      return typeof snapshot.terminalId === "string" ? snapshot.terminalId : undefined;
    },
    [refreshColumns],
  );

  const onTentacleAction = useCallback(
    async (tentacleId: string, action: string): Promise<string | undefined> => {
      const response = await fetch(buildTerminalsUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceMode: "shared",
          tentacleId,
          promptTemplate: action,
          promptVariables: {
            tentacleId,
          },
        }),
      });
      if (!response.ok) return undefined;
      const snapshot = (await response.json()) as { terminalId?: string };
      await refreshColumns();
      return typeof snapshot.terminalId === "string" ? snapshot.terminalId : undefined;
    },
    [refreshColumns],
  );

  const onNavigateToConversation = useCallback(
    (_sessionId: string): void => {
      setActivePrimaryNav(6 as PrimaryNavIndex);
    },
    [setActivePrimaryNav],
  );

  const onDeleteActiveSession = useCallback(
    (terminalId: string, terminalName: string, workspaceMode?: string): void => {
      requestDeleteTerminal(terminalId, terminalName, {
        workspaceMode: workspaceMode === "worktree" ? "worktree" : "shared",
        intent: "delete-terminal",
      });
    },
    [requestDeleteTerminal],
  );

  const onCancelDelete = useCallback((): void => {
    clearPendingDeleteTerminal();
  }, [clearPendingDeleteTerminal]);

  const onConfirmDelete = useCallback((): void => {
    void confirmDeleteTerminal();
  }, [confirmDeleteTerminal]);

  const onRefreshColumns = useCallback(async (): Promise<void> => {
    await refreshColumns();
  }, [refreshColumns]);

  return {
    onLaunchWorkspaceSetupPlanner,
    onCreateAgent,
    onCreateTerminal,
    onCreateWorktreeTerminal,
    onCreateTentacle,
    onSpawnSwarm,
    onOctobossAction,
    onTentacleAction,
    onNavigateToConversation,
    onDeleteActiveSession,
    onCancelDelete,
    onConfirmDelete,
    onRefreshColumns,
  };
};
