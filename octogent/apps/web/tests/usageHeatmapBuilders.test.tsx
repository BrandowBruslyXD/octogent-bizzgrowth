import { describe, expect, it } from "vitest";

import type { UsageDayEntry } from "../src/app/hooks/useUsageHeatmapPolling";
import {
  buildBars,
  buildColorMap,
  buildHeatmapGrid,
  buildMonthLabels,
  buildUsageStats,
  buildYTicks,
  formatDateLabel,
  formatTokenCount,
} from "../src/app/usageHeatmapBuilders";
import type { BarData } from "../src/app/usageHeatmapBuilders";

/* ── formatTokenCount ───────────────────────────────────────────────────── */

describe("formatTokenCount", () => {
  it("formats values below 1K as plain integers", () => {
    expect(formatTokenCount(0)).toBe("0");
    expect(formatTokenCount(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(formatTokenCount(1_000)).toBe("1.0K");
    expect(formatTokenCount(45_500)).toBe("45.5K");
  });

  it("formats millions with M suffix", () => {
    expect(formatTokenCount(1_000_000)).toBe("1.0M");
    expect(formatTokenCount(2_500_000)).toBe("2.5M");
  });
});

/* ── buildYTicks ────────────────────────────────────────────────────────── */

describe("buildYTicks", () => {
  it("returns empty array when maxTokens is 0", () => {
    expect(buildYTicks(0)).toEqual([]);
  });

  it("returns 5 ticks (0 to max) for any positive maxTokens", () => {
    const ticks = buildYTicks(1_000);
    expect(ticks).toHaveLength(5);
    expect(ticks[0]?.value).toBe(0);
    expect(ticks[4]?.value).toBe(1_000);
  });

  it("tick labels are formatted with formatTokenCount", () => {
    const ticks = buildYTicks(4_000);
    // step = 1000, so ticks at 0, 1K, 2K, 3K, 4K
    expect(ticks[1]?.label).toBe("1.0K");
    expect(ticks[4]?.label).toBe("4.0K");
  });
});

/* ── buildColorMap ──────────────────────────────────────────────────────── */

describe("buildColorMap", () => {
  it("maps each key to a distinct SEGMENT_COLOR", () => {
    const map = buildColorMap(["alpha", "beta", "gamma"]);
    expect(map.size).toBe(3);
    expect(map.get("alpha")).toBeDefined();
    expect(map.get("alpha")).not.toBe(map.get("beta"));
  });

  it("wraps around when more keys than colors", () => {
    // SEGMENT_COLORS has 12 entries; key 0 and key 12 should share the same color
    const keys = Array.from({ length: 13 }, (_, i) => `key-${i}`);
    const map = buildColorMap(keys);
    expect(map.get("key-0")).toBe(map.get("key-12"));
  });
});

/* ── buildBars ──────────────────────────────────────────────────────────── */

describe("buildBars", () => {
  const day: UsageDayEntry = {
    date: "2025-01-15",
    totalTokens: 500,
    sessions: 3,
    models: [{ key: "claude-3", tokens: 500 }],
    projects: [
      { key: "proj-a", tokens: 300 },
      { key: "proj-b", tokens: 200 },
    ],
  };

  it("produces one BarData per UsageDayEntry", () => {
    const bars = buildBars([day], ["proj-a", "proj-b"], "project");
    expect(bars).toHaveLength(1);
    expect(bars[0]?.date).toBe("2025-01-15");
    expect(bars[0]?.totalTokens).toBe(500);
  });

  it("uses project slices in project mode", () => {
    const bars = buildBars([day], ["proj-a", "proj-b"], "project");
    expect(bars[0]?.segments).toHaveLength(2);
    expect(bars[0]?.segments[0]?.label).toBe("proj-a");
  });

  it("uses model slices in model mode", () => {
    const bars = buildBars([day], ["claude-3"], "model");
    expect(bars[0]?.segments[0]?.label).toBe("claude-3");
  });
});

/* ── buildHeatmapGrid ───────────────────────────────────────────────────── */

describe("buildHeatmapGrid", () => {
  it("returns exactly WEEKS_TO_SHOW * 7 cells", () => {
    const cells = buildHeatmapGrid([]);
    expect(cells).toHaveLength(26 * 7);
  });

  it("assigns intensity 0 to days with no tokens", () => {
    const cells = buildHeatmapGrid([]);
    expect(cells.every((c) => c.intensity === 0)).toBe(true);
  });

  it("assigns intensity > 0 to days with tokens present in bars", () => {
    // Use a recent date guaranteed to fall inside the 26-week window
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const bar: BarData = { date: dateStr, totalTokens: 1000, sessions: 5, segments: [] };
    const cells = buildHeatmapGrid([bar]);
    const match = cells.find((c) => c.date === dateStr);
    expect(match?.intensity).toBeGreaterThan(0);
  });
});

/* ── buildMonthLabels ───────────────────────────────────────────────────── */

describe("buildMonthLabels", () => {
  it("returns an array (possibly empty) from an empty cell list", () => {
    expect(buildMonthLabels([])).toEqual([]);
  });

  it("does not produce duplicate months", () => {
    const cells = buildHeatmapGrid([]);
    const labels = buildMonthLabels(cells);
    const names = labels.map((l) => l.label);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

/* ── buildUsageStats ────────────────────────────────────────────────────── */

describe("buildUsageStats", () => {
  const days: UsageDayEntry[] = [
    { date: "2025-01-01", totalTokens: 100, sessions: 2, models: [], projects: [] },
    { date: "2025-01-02", totalTokens: 900, sessions: 8, models: [], projects: [] },
    { date: "2025-01-03", totalTokens: 0, sessions: 0, models: [], projects: [] },
  ];

  it("returns null when days array is empty", () => {
    expect(buildUsageStats([], 0, 0, [], [])).toBeNull();
  });

  it("identifies the peak day correctly", () => {
    const stats = buildUsageStats(days, 1000, 10, ["gpt-4"], ["proj"]);
    expect(stats?.peakDay.date).toBe("2025-01-02");
  });

  it("computes avgPerSession correctly", () => {
    const stats = buildUsageStats(days, 1000, 10, [], []);
    expect(stats?.avgPerSession).toBe(100);
  });

  it("returns 0 avgPerSession when totalSessions is 0", () => {
    const stats = buildUsageStats(days, 1000, 0, [], []);
    expect(stats?.avgPerSession).toBe(0);
  });

  it("computes maxStreak skipping zero-token days", () => {
    // days[0]=100, days[1]=900, days[2]=0 → streak ends at 0, maxStreak=2
    const stats = buildUsageStats(days, 1000, 10, [], []);
    expect(stats?.maxStreak).toBe(2);
  });

  it("uses dash fallback when models/projects arrays are empty", () => {
    const stats = buildUsageStats(days, 0, 0, [], []);
    expect(stats?.topModel).toBe("—");
    expect(stats?.topProject).toBe("—");
  });
});

/* ── formatDateLabel ────────────────────────────────────────────────────── */

describe("formatDateLabel", () => {
  it("formats a date string as month + day", () => {
    // 2025-01-15 → "Jan 15"
    expect(formatDateLabel("2025-01-15")).toBe("Jan 15");
  });
});
