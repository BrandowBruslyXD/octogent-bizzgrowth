import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import {
  buildTentacleGitCommitUrl,
  buildTentacleGitPullRequestMergeUrl,
  buildTentacleGitPullRequestUrl,
  buildTentacleGitPushUrl,
  buildTentacleGitStatusUrl,
  buildTentacleGitSyncUrl,
} from "../../runtime/runtimeEndpoints";
import {
  parseGitError,
  parseTentacleGitStatus,
  parseTentaclePullRequest,
} from "../gitLifecycleParsers";
import type {
  TentacleGitStatusSnapshot,
  TentaclePullRequestSnapshot,
  TerminalView,
} from "../types";

type UseTentacleGitLifecycleOptions = {
  columns: TerminalView;
};

type UseTentacleGitLifecycleResult = {
  gitStatusByTentacleId: Record<string, TentacleGitStatusSnapshot>;
  gitStatusLoadingByTentacleId: Record<string, boolean>;
  pullRequestByTentacleId: Record<string, TentaclePullRequestSnapshot>;
  pullRequestLoadingByTentacleId: Record<string, boolean>;
  openGitTentacleId: string | null;
  openGitTentacleStatus: TentacleGitStatusSnapshot | null;
  openGitTentaclePullRequest: TentaclePullRequestSnapshot | null;
  gitCommitMessageDraft: string;
  gitDialogError: string | null;
  isGitDialogLoading: boolean;
  isGitDialogMutating: boolean;
  setGitCommitMessageDraft: Dispatch<SetStateAction<string>>;
  openTentacleGitActions: (tentacleId: string) => void;
  closeTentacleGitActions: () => void;
  commitTentacleChanges: () => Promise<void>;
  commitAndPushTentacleBranch: () => Promise<void>;
  pushTentacleBranch: () => Promise<void>;
  syncTentacleBranch: () => Promise<void>;
  mergeTentaclePullRequest: () => Promise<void>;
};

export const useTentacleGitLifecycle = ({
  columns,
}: UseTentacleGitLifecycleOptions): UseTentacleGitLifecycleResult => {
  const [gitStatusByTentacleId, setGitStatusByTentacleId] = useState<
    Record<string, TentacleGitStatusSnapshot>
  >({});
  const [gitStatusLoadingByTentacleId, setGitStatusLoadingByTentacleId] = useState<
    Record<string, boolean>
  >({});
  const [gitStatusAttemptedTentacleIds, setGitStatusAttemptedTentacleIds] = useState<
    Record<string, boolean>
  >({});
  const [pullRequestByTentacleId, setPullRequestByTentacleId] = useState<
    Record<string, TentaclePullRequestSnapshot>
  >({});
  const [pullRequestLoadingByTentacleId, setPullRequestLoadingByTentacleId] = useState<
    Record<string, boolean>
  >({});
  const [pullRequestAttemptedTentacleIds, setPullRequestAttemptedTentacleIds] = useState<
    Record<string, boolean>
  >({});
  const [openGitTentacleId, setOpenGitTentacleId] = useState<string | null>(null);
  const [gitCommitMessageDraft, setGitCommitMessageDraft] = useState("");
  const [gitDialogError, setGitDialogError] = useState<string | null>(null);
  const [isGitDialogMutating, setIsGitDialogMutating] = useState(false);

  const fetchTentacleGitStatus = useCallback(async (tentacleId: string, signal?: AbortSignal) => {
    setGitStatusLoadingByTentacleId((current) => ({
      ...current,
      [tentacleId]: true,
    }));

    try {
      const requestInit: RequestInit = {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      };
      if (signal) requestInit.signal = signal;
      const response = await fetch(buildTentacleGitStatusUrl(tentacleId), requestInit);
      if (!response.ok) {
        const errorMessage = await parseGitError(
          response,
          `Unable to fetch git status (${response.status}).`,
        );
        throw new Error(errorMessage);
      }

      const payload = parseTentacleGitStatus(await response.json());
      if (!payload) {
        throw new Error("Unable to parse git status response.");
      }

      setGitStatusByTentacleId((current) => ({
        ...current,
        [tentacleId]: payload,
      }));
      return payload;
    } finally {
      setGitStatusLoadingByTentacleId((current) => ({
        ...current,
        [tentacleId]: false,
      }));
    }
  }, []);

  const fetchTentaclePullRequest = useCallback(async (tentacleId: string, signal?: AbortSignal) => {
    setPullRequestLoadingByTentacleId((current) => ({
      ...current,
      [tentacleId]: true,
    }));

    try {
      const requestInit: RequestInit = {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      };
      if (signal) requestInit.signal = signal;
      const response = await fetch(buildTentacleGitPullRequestUrl(tentacleId), requestInit);
      if (!response.ok) {
        const errorMessage = await parseGitError(
          response,
          `Unable to fetch pull request status (${response.status}).`,
        );
        throw new Error(errorMessage);
      }

      const payload = parseTentaclePullRequest(await response.json());
      if (!payload) {
        throw new Error("Unable to parse pull request response.");
      }

      setPullRequestByTentacleId((current) => ({
        ...current,
        [tentacleId]: payload,
      }));
      return payload;
    } finally {
      setPullRequestLoadingByTentacleId((current) => ({
        ...current,
        [tentacleId]: false,
      }));
    }
  }, []);

  const worktreeTentacleIds = useMemo(
    () =>
      columns
        .filter((column) => column.workspaceMode === "worktree")
        .map((column) => column.tentacleId),
    [columns],
  );

  useEffect(() => {
    const activeTentacleIds = new Set(columns.map((column) => column.tentacleId));
    setGitStatusByTentacleId((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tentacleId]) => activeTentacleIds.has(tentacleId)),
      ),
    );
    setGitStatusLoadingByTentacleId((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tentacleId]) => activeTentacleIds.has(tentacleId)),
      ),
    );
    setGitStatusAttemptedTentacleIds((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tentacleId]) => activeTentacleIds.has(tentacleId)),
      ),
    );
    setPullRequestByTentacleId((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tentacleId]) => activeTentacleIds.has(tentacleId)),
      ),
    );
    setPullRequestLoadingByTentacleId((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tentacleId]) => activeTentacleIds.has(tentacleId)),
      ),
    );
    setPullRequestAttemptedTentacleIds((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([tentacleId]) => activeTentacleIds.has(tentacleId)),
      ),
    );
    if (openGitTentacleId && !activeTentacleIds.has(openGitTentacleId)) {
      setOpenGitTentacleId(null);
      setGitDialogError(null);
      setGitCommitMessageDraft("");
    }
  }, [columns, openGitTentacleId]);

  useEffect(() => {
    const controller = new AbortController();
    for (const tentacleId of worktreeTentacleIds) {
      if (gitStatusAttemptedTentacleIds[tentacleId]) {
        continue;
      }

      setGitStatusAttemptedTentacleIds((current) => ({
        ...current,
        [tentacleId]: true,
      }));
      void fetchTentacleGitStatus(tentacleId, controller.signal).catch((error: unknown) => {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        console.warn(`[git] Failed to fetch status for tentacle ${tentacleId}:`, error);
      });
    }
    return () => controller.abort();
  }, [fetchTentacleGitStatus, gitStatusAttemptedTentacleIds, worktreeTentacleIds]);

  useEffect(() => {
    const controller = new AbortController();
    for (const tentacleId of worktreeTentacleIds) {
      if (pullRequestAttemptedTentacleIds[tentacleId]) {
        continue;
      }

      setPullRequestAttemptedTentacleIds((current) => ({
        ...current,
        [tentacleId]: true,
      }));
      void fetchTentaclePullRequest(tentacleId, controller.signal).catch((error: unknown) => {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        console.warn(`[git] Failed to fetch pull request for tentacle ${tentacleId}:`, error);
      });
    }
    return () => controller.abort();
  }, [fetchTentaclePullRequest, pullRequestAttemptedTentacleIds, worktreeTentacleIds]);

  const openTentacleGitActions = useCallback(
    (tentacleId: string) => {
      setOpenGitTentacleId(tentacleId);
      setGitDialogError(null);
      setGitCommitMessageDraft("");

      void Promise.all([
        fetchTentacleGitStatus(tentacleId),
        fetchTentaclePullRequest(tentacleId),
      ]).catch((error: unknown) => {
        setGitDialogError(
          error instanceof Error ? error.message : "Unable to fetch git lifecycle data.",
        );
      });
    },
    [fetchTentacleGitStatus, fetchTentaclePullRequest],
  );

  const closeTentacleGitActions = useCallback(() => {
    setOpenGitTentacleId(null);
    setGitDialogError(null);
    setGitCommitMessageDraft("");
  }, []);

  const runGitMutation = useCallback(
    async (
      action: "commit" | "push" | "sync",
      request: { body?: string; headers?: Record<string, string> } = {},
    ): Promise<TentacleGitStatusSnapshot | null> => {
      if (!openGitTentacleId) {
        return null;
      }

      const endpoint =
        action === "commit"
          ? buildTentacleGitCommitUrl(openGitTentacleId)
          : action === "push"
            ? buildTentacleGitPushUrl(openGitTentacleId)
            : buildTentacleGitSyncUrl(openGitTentacleId);

      setIsGitDialogMutating(true);
      setGitDialogError(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...request.headers,
          },
          body: request.body ?? null,
        });

        if (!response.ok) {
          const errorMessage = await parseGitError(
            response,
            `Unable to ${action} (${response.status}).`,
          );
          throw new Error(errorMessage);
        }

        const payload = parseTentacleGitStatus(await response.json());
        if (!payload) {
          throw new Error("Unable to parse git lifecycle response.");
        }

        setGitStatusByTentacleId((current) => ({
          ...current,
          [openGitTentacleId]: payload,
        }));
        return payload;
      } catch (error) {
        setGitDialogError(
          error instanceof Error ? error.message : `Unable to ${action} tentacle worktree.`,
        );
        return null;
      } finally {
        setIsGitDialogMutating(false);
      }
    },
    [openGitTentacleId],
  );

  const runPullRequestMutation = useCallback(
    async (request: { body?: string; headers?: Record<string, string> } = {}) => {
      if (!openGitTentacleId) {
        return;
      }

      const endpoint = buildTentacleGitPullRequestMergeUrl(openGitTentacleId);

      setIsGitDialogMutating(true);
      setGitDialogError(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...request.headers,
          },
          body: request.body ?? null,
        });

        if (!response.ok) {
          const errorMessage = await parseGitError(
            response,
            `Unable to merge pull request (${response.status}).`,
          );
          throw new Error(errorMessage);
        }

        const payload = parseTentaclePullRequest(await response.json());
        if (!payload) {
          throw new Error("Unable to parse pull request response.");
        }

        setPullRequestByTentacleId((current) => ({
          ...current,
          [openGitTentacleId]: payload,
        }));
      } catch (error) {
        setGitDialogError(error instanceof Error ? error.message : "Unable to merge pull request.");
      } finally {
        setIsGitDialogMutating(false);
      }
    },
    [openGitTentacleId],
  );

  const commitTentacleChanges = useCallback(async () => {
    const message = gitCommitMessageDraft.trim();
    if (message.length === 0) {
      setGitDialogError("Commit message cannot be empty.");
      return;
    }

    const committed = await runGitMutation("commit", {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    if (committed) {
      setGitCommitMessageDraft("");
    }
  }, [gitCommitMessageDraft, runGitMutation]);

  const commitAndPushTentacleBranch = useCallback(async () => {
    const message = gitCommitMessageDraft.trim();
    if (message.length === 0) {
      setGitDialogError("Commit message cannot be empty.");
      return;
    }

    const committed = await runGitMutation("commit", {
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    if (!committed) {
      return;
    }
    setGitCommitMessageDraft("");
    await runGitMutation("push");
  }, [gitCommitMessageDraft, runGitMutation]);

  const pushTentacleBranch = useCallback(async () => {
    await runGitMutation("push");
  }, [runGitMutation]);

  const syncTentacleBranch = useCallback(async () => {
    await runGitMutation("sync");
  }, [runGitMutation]);

  const mergeTentaclePullRequest = useCallback(async () => {
    await runPullRequestMutation();
  }, [runPullRequestMutation]);

  const openGitTentacleStatus =
    openGitTentacleId !== null ? (gitStatusByTentacleId[openGitTentacleId] ?? null) : null;
  const openGitTentaclePullRequest =
    openGitTentacleId !== null ? (pullRequestByTentacleId[openGitTentacleId] ?? null) : null;
  const isGitDialogLoading =
    openGitTentacleId !== null
      ? (gitStatusLoadingByTentacleId[openGitTentacleId] ?? false) ||
        (pullRequestLoadingByTentacleId[openGitTentacleId] ?? false)
      : false;

  return {
    gitStatusByTentacleId,
    gitStatusLoadingByTentacleId,
    pullRequestByTentacleId,
    pullRequestLoadingByTentacleId,
    openGitTentacleId,
    openGitTentacleStatus,
    openGitTentaclePullRequest,
    gitCommitMessageDraft,
    gitDialogError,
    isGitDialogLoading,
    isGitDialogMutating,
    setGitCommitMessageDraft,
    openTentacleGitActions,
    closeTentacleGitActions,
    commitTentacleChanges,
    commitAndPushTentacleBranch,
    pushTentacleBranch,
    syncTentacleBranch,
    mergeTentaclePullRequest,
  };
};
