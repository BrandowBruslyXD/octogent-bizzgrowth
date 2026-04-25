import type { TentacleGitStatusSnapshot, TentaclePullRequestSnapshot } from "./types";

export const parseGitError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim().length > 0) {
      return payload.error.trim();
    }
  } catch {
    return fallback;
  }

  return fallback;
};

export const parseTentacleGitStatus = (payload: unknown): TentacleGitStatusSnapshot | null => {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (
    typeof record.tentacleId !== "string" ||
    (record.workspaceMode !== "shared" && record.workspaceMode !== "worktree") ||
    typeof record.branchName !== "string" ||
    (record.upstreamBranchName !== null && typeof record.upstreamBranchName !== "string") ||
    typeof record.isDirty !== "boolean" ||
    typeof record.aheadCount !== "number" ||
    typeof record.behindCount !== "number" ||
    typeof record.hasConflicts !== "boolean" ||
    !Array.isArray(record.changedFiles) ||
    !record.changedFiles.every((file) => typeof file === "string") ||
    (record.defaultBaseBranchName !== null && typeof record.defaultBaseBranchName !== "string")
  ) {
    return null;
  }

  return {
    tentacleId: record.tentacleId,
    workspaceMode: record.workspaceMode,
    branchName: record.branchName,
    upstreamBranchName: record.upstreamBranchName,
    isDirty: record.isDirty,
    aheadCount: record.aheadCount,
    behindCount: record.behindCount,
    insertedLineCount: typeof record.insertedLineCount === "number" ? record.insertedLineCount : 0,
    deletedLineCount: typeof record.deletedLineCount === "number" ? record.deletedLineCount : 0,
    hasConflicts: record.hasConflicts,
    changedFiles: [...record.changedFiles],
    defaultBaseBranchName: record.defaultBaseBranchName,
  };
};

export const parseTentaclePullRequest = (payload: unknown): TentaclePullRequestSnapshot | null => {
  if (payload === null || payload === undefined || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  if (
    typeof record.tentacleId !== "string" ||
    (record.workspaceMode !== "shared" && record.workspaceMode !== "worktree") ||
    (record.status !== "none" &&
      record.status !== "open" &&
      record.status !== "merged" &&
      record.status !== "closed") ||
    (record.number !== null && typeof record.number !== "number") ||
    (record.url !== null && typeof record.url !== "string") ||
    (record.title !== null && typeof record.title !== "string") ||
    (record.baseRef !== null && typeof record.baseRef !== "string") ||
    (record.headRef !== null && typeof record.headRef !== "string") ||
    (record.isDraft !== null && typeof record.isDraft !== "boolean") ||
    (record.mergeable !== null &&
      record.mergeable !== "MERGEABLE" &&
      record.mergeable !== "CONFLICTING" &&
      record.mergeable !== "UNKNOWN") ||
    (record.mergeStateStatus !== null && typeof record.mergeStateStatus !== "string")
  ) {
    return null;
  }

  return {
    tentacleId: record.tentacleId,
    workspaceMode: record.workspaceMode,
    status: record.status,
    number: record.number,
    url: record.url,
    title: record.title,
    baseRef: record.baseRef,
    headRef: record.headRef,
    isDraft: record.isDraft,
    mergeable: record.mergeable,
    mergeStateStatus: record.mergeStateStatus,
  };
};
