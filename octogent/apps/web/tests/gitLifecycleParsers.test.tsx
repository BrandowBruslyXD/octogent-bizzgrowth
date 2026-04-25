import { describe, expect, it } from "vitest";

import {
  parseGitError,
  parseTentacleGitStatus,
  parseTentaclePullRequest,
} from "../src/app/gitLifecycleParsers";

// ---------------------------------------------------------------------------
// parseTentacleGitStatus
// ---------------------------------------------------------------------------

describe("parseTentacleGitStatus", () => {
  const validPayload = {
    tentacleId: "t-001",
    workspaceMode: "worktree",
    branchName: "feat/my-branch",
    upstreamBranchName: "origin/feat/my-branch",
    isDirty: true,
    aheadCount: 2,
    behindCount: 0,
    insertedLineCount: 10,
    deletedLineCount: 3,
    hasConflicts: false,
    changedFiles: ["src/foo.ts", "src/bar.ts"],
    defaultBaseBranchName: "main",
  };

  it("accepts a fully valid worktree payload", () => {
    const result = parseTentacleGitStatus(validPayload);
    expect(result).not.toBeNull();
    expect(result?.tentacleId).toBe("t-001");
    expect(result?.workspaceMode).toBe("worktree");
    expect(result?.changedFiles).toHaveLength(2);
    expect(result?.insertedLineCount).toBe(10);
  });

  it("accepts a shared-mode payload with null optional fields", () => {
    const payload = {
      ...validPayload,
      workspaceMode: "shared",
      upstreamBranchName: null,
      defaultBaseBranchName: null,
    };
    const result = parseTentacleGitStatus(payload);
    expect(result).not.toBeNull();
    expect(result?.workspaceMode).toBe("shared");
    expect(result?.upstreamBranchName).toBeNull();
  });

  it("defaults insertedLineCount and deletedLineCount to 0 when absent", () => {
    const { insertedLineCount: _i, deletedLineCount: _d, ...rest } = validPayload;
    const result = parseTentacleGitStatus(rest);
    expect(result).not.toBeNull();
    expect(result?.insertedLineCount).toBe(0);
    expect(result?.deletedLineCount).toBe(0);
  });

  it("returns null for null input", () => {
    expect(parseTentacleGitStatus(null)).toBeNull();
  });

  it("returns null when required field is missing (no branchName)", () => {
    const { branchName: _, ...bad } = validPayload;
    expect(parseTentacleGitStatus(bad)).toBeNull();
  });

  it("returns null when workspaceMode is an unrecognised value", () => {
    expect(parseTentacleGitStatus({ ...validPayload, workspaceMode: "unknown" })).toBeNull();
  });

  it("returns null when changedFiles contains a non-string element", () => {
    expect(parseTentacleGitStatus({ ...validPayload, changedFiles: [42] })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseTentaclePullRequest
// ---------------------------------------------------------------------------

describe("parseTentaclePullRequest", () => {
  const validPayload = {
    tentacleId: "t-001",
    workspaceMode: "worktree",
    status: "open",
    number: 7,
    url: "https://github.com/org/repo/pull/7",
    title: "My PR",
    baseRef: "main",
    headRef: "feat/my-branch",
    isDraft: false,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
  };

  it("accepts a fully valid open PR payload", () => {
    const result = parseTentaclePullRequest(validPayload);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("open");
    expect(result?.mergeable).toBe("MERGEABLE");
  });

  it("accepts a none-status payload with all nullable fields set to null", () => {
    const payload = {
      tentacleId: "t-002",
      workspaceMode: "shared",
      status: "none",
      number: null,
      url: null,
      title: null,
      baseRef: null,
      headRef: null,
      isDraft: null,
      mergeable: null,
      mergeStateStatus: null,
    };
    const result = parseTentaclePullRequest(payload);
    expect(result).not.toBeNull();
    expect(result?.number).toBeNull();
  });

  it("accepts a merged status payload", () => {
    const result = parseTentaclePullRequest({ ...validPayload, status: "merged" });
    expect(result?.status).toBe("merged");
  });

  it("returns null for undefined input", () => {
    expect(parseTentaclePullRequest(undefined)).toBeNull();
  });

  it("returns null when status is an unrecognised value", () => {
    expect(parseTentaclePullRequest({ ...validPayload, status: "pending" })).toBeNull();
  });

  it("returns null when mergeable is an unrecognised value", () => {
    expect(parseTentaclePullRequest({ ...validPayload, mergeable: "MAYBE" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseGitError
// ---------------------------------------------------------------------------

describe("parseGitError", () => {
  const makeResponse = (body: unknown, status = 422) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  it("extracts the error string from a JSON payload", async () => {
    const response = makeResponse({ error: "branch not found" });
    const message = await parseGitError(response, "fallback");
    expect(message).toBe("branch not found");
  });

  it("trims whitespace from the error string", async () => {
    const response = makeResponse({ error: "  push rejected  " });
    const message = await parseGitError(response, "fallback");
    expect(message).toBe("push rejected");
  });

  it("uses the fallback when the payload has no error field", async () => {
    const response = makeResponse({ message: "oops" });
    const message = await parseGitError(response, "default error");
    expect(message).toBe("default error");
  });

  it("uses the fallback when error is an empty string", async () => {
    const response = makeResponse({ error: "   " });
    const message = await parseGitError(response, "fallback empty");
    expect(message).toBe("fallback empty");
  });

  it("uses the fallback when the body is not valid JSON", async () => {
    const response = new Response("not-json", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
    const message = await parseGitError(response, "parse failed");
    expect(message).toBe("parse failed");
  });
});
