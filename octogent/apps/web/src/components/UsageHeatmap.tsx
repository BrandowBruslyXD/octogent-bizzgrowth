import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { UsageChartData } from "../app/hooks/useUsageHeatmapPolling";
import {
  INTENSITY_COLORS,
  MONTH_LABELS,
  SEGMENT_COLORS,
  WEEKS_TO_SHOW,
  buildBars,
  buildColorMap,
  buildHeatmapGrid,
  buildMonthLabels,
  buildTrendPath,
  buildUsageStats,
  buildYTicks,
  formatDateLabel,
  formatTokenCount,
} from "../app/usageHeatmapBuilders";
import type { BarData, BarSegmentMode, HeatmapCell } from "../app/usageHeatmapBuilders";
import { ActionButton } from "./ui/ActionButton";

// Re-export constants consumed only by this file (avoids unused-import warnings)
void SEGMENT_COLORS;
void MONTH_LABELS;

type UsageChartSectionProps = {
  data: UsageChartData | null;
  isLoading: boolean;
  onRefresh: () => void;
};

const CELL_GAP = 3;
const CELL_RADIUS = 2;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

/* ── Tooltip ────────────────────────────────────────────────────────────── */

const ChartTooltip = ({
  bar,
  x,
  y,
  containerWidth,
}: { bar: BarData; x: number; y: number; containerWidth: number }) => {
  const isRightHalf = x > containerWidth / 2;
  return (
    <div
      className="usage-heatmap-tooltip"
      aria-live="polite"
      style={
        isRightHalf
          ? { right: `${containerWidth - x + 12}px`, top: `${y + 12}px` }
          : { left: `${x + 12}px`, top: `${y + 12}px` }
      }
    >
      <p className="usage-heatmap-tooltip-date">{formatDateLabel(bar.date)}</p>
      <dl className="usage-heatmap-tooltip-stats">
        <div>
          <dt>Total</dt>
          <dd>{formatTokenCount(bar.totalTokens)}</dd>
        </div>
        {bar.segments.map((seg) => (
          <div key={seg.label}>
            <dt>
              <span className="usage-chart-legend-dot" style={{ backgroundColor: seg.color }} />
              {seg.label}
            </dt>
            <dd>{formatTokenCount(seg.tokens)}</dd>
          </div>
        ))}
        <div>
          <dt>Sessions</dt>
          <dd>{bar.sessions}</dd>
        </div>
      </dl>
    </div>
  );
};

/* ── Bar chart view ─────────────────────────────────────────────────────── */

const Y_AXIS_WIDTH = 52;
const X_LABEL_HEIGHT = 18;
const TOP_PAD = 6;
const BAR_GAP_RATIO = 0.3;

const BarChartView = ({
  bars,
  maxTokens,
  containerWidth,
  containerHeight,
  setHoveredBar,
}: {
  bars: BarData[];
  maxTokens: number;
  containerWidth: number;
  containerHeight: number;
  hoveredBar: BarData | null;
  setHoveredBar: (bar: BarData | null) => void;
}) => {
  const chartAreaWidth = containerWidth - Y_AXIS_WIDTH;
  const barCount = bars.length || 1;
  const barSlotWidth = chartAreaWidth / barCount;
  const barWidth = barSlotWidth * (1 - BAR_GAP_RATIO);
  const barGap = barSlotWidth * BAR_GAP_RATIO;
  const chartHeight = Math.max(60, containerHeight - X_LABEL_HEIGHT - TOP_PAD);
  const svgHeight = TOP_PAD + chartHeight + X_LABEL_HEIGHT;

  const yTicks = useMemo(() => buildYTicks(maxTokens), [maxTokens]);
  const xLabelStep = Math.max(1, Math.ceil(barCount / Math.floor(chartAreaWidth / 60)));

  const trendPath = useMemo(
    () => buildTrendPath(bars, maxTokens, chartHeight, Y_AXIS_WIDTH, TOP_PAD, barSlotWidth),
    [bars, maxTokens, chartHeight, barSlotWidth],
  );

  return (
    <svg
      className="usage-chart-svg"
      viewBox={`0 0 ${containerWidth} ${svgHeight}`}
      role="img"
      aria-label="Token usage bar chart"
    >
      {yTicks.map((tick) => {
        const y =
          TOP_PAD + chartHeight - (maxTokens > 0 ? (tick.value / maxTokens) * chartHeight : 0);
        return (
          <g key={tick.value}>
            <line
              x1={Y_AXIS_WIDTH}
              y1={y}
              x2={containerWidth}
              y2={y}
              className="usage-chart-grid-line"
            />
            <text x={Y_AXIS_WIDTH - 6} y={y + 3.5} className="usage-chart-y-label">
              {tick.label}
            </text>
          </g>
        );
      })}

      {bars.map((bar, i) => {
        const x = Y_AXIS_WIDTH + i * barSlotWidth + barGap / 2;
        let yOffset = TOP_PAD + chartHeight;

        return (
          <g
            key={bar.date}
            onMouseEnter={() => setHoveredBar(bar)}
            onMouseLeave={() => setHoveredBar(null)}
            className="usage-chart-bar-group"
          >
            <rect
              x={x}
              y={TOP_PAD}
              width={barWidth}
              height={chartHeight}
              fill="transparent"
              className="usage-chart-bar-hit"
            />
            {bar.segments.map((seg) => {
              const segHeight = maxTokens > 0 ? (seg.tokens / maxTokens) * chartHeight : 0;
              yOffset -= segHeight;
              return (
                <rect
                  key={seg.label}
                  x={x}
                  y={yOffset}
                  width={barWidth}
                  height={Math.max(0.5, segHeight)}
                  fill={seg.color}
                  rx={1}
                />
              );
            })}
          </g>
        );
      })}

      {bars.map((bar, i) => {
        if (i % xLabelStep !== 0) return null;
        const x = Y_AXIS_WIDTH + i * barSlotWidth + barSlotWidth / 2;
        return (
          <text
            key={`label-${bar.date}`}
            x={x}
            y={TOP_PAD + chartHeight + X_LABEL_HEIGHT - 2}
            className="usage-chart-x-label"
          >
            {formatDateLabel(bar.date)}
          </text>
        );
      })}

      {trendPath && (
        <path
          d={trendPath}
          className="usage-chart-trend-line"
          fill="none"
          stroke="rgba(215, 166, 34, 0.55)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

/* ── Heatmap view ───────────────────────────────────────────────────────── */

const HeatmapView = ({
  bars,
  containerWidth,
  containerHeight,
  setHoveredBar,
}: {
  bars: BarData[];
  containerWidth: number;
  containerHeight: number;
  hoveredBar: BarData | null;
  setHoveredBar: (bar: BarData | null) => void;
}) => {
  const cells = useMemo(() => buildHeatmapGrid(bars), [bars]);
  const monthLabels = useMemo(() => buildMonthLabels(cells), [cells]);

  const dayLabelWidth = 32;
  const monthLabelHeight = 16;
  const availableHeight = containerHeight - monthLabelHeight - 8;
  const availableWidth = containerWidth - dayLabelWidth - 8;
  const cellSize = Math.max(
    8,
    Math.min(
      Math.floor((availableHeight - 6 * CELL_GAP) / 7),
      Math.floor((availableWidth - (WEEKS_TO_SHOW - 1) * CELL_GAP) / WEEKS_TO_SHOW),
    ),
  );
  const gridWidth = WEEKS_TO_SHOW * (cellSize + CELL_GAP);
  const gridHeight = 7 * (cellSize + CELL_GAP);
  const svgWidth = dayLabelWidth + gridWidth + 8;
  const svgHeight = monthLabelHeight + gridHeight + 8;

  return (
    <svg
      className="usage-chart-svg usage-chart-svg--heatmap"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      width={svgWidth}
      height={svgHeight}
      role="img"
      aria-label="Token usage heatmap"
    >
      {monthLabels.map(({ label, week }) => (
        <text
          key={`month-${week}`}
          x={dayLabelWidth + week * (cellSize + CELL_GAP)}
          y={monthLabelHeight - 4}
          className="usage-heatmap-month-label"
        >
          {label}
        </text>
      ))}

      {DAY_LABELS.map((label, dayIndex) =>
        label ? (
          <text
            key={label}
            x={dayLabelWidth - 6}
            y={monthLabelHeight + dayIndex * (cellSize + CELL_GAP) + cellSize - 2}
            className="usage-heatmap-day-label"
          >
            {label}
          </text>
        ) : null,
      )}

      {cells.map((cell: HeatmapCell) => (
        <rect
          key={cell.date}
          x={dayLabelWidth + cell.week * (cellSize + CELL_GAP)}
          y={monthLabelHeight + cell.dayOfWeek * (cellSize + CELL_GAP)}
          width={cellSize}
          height={cellSize}
          rx={CELL_RADIUS}
          fill={INTENSITY_COLORS[cell.intensity] ?? INTENSITY_COLORS[0] ?? "transparent"}
          className="usage-heatmap-cell"
          onMouseEnter={() => {
            if (cell.bar) setHoveredBar(cell.bar);
          }}
          onMouseLeave={() => setHoveredBar(null)}
        />
      ))}
    </svg>
  );
};

/* ── Panel size hook ────────────────────────────────────────────────────── */

const usePanelSize = () => {
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(200);
  const ref = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    if (ref.current) {
      setWidth(ref.current.clientWidth);
      setHeight(ref.current.clientHeight);
    }
  }, []);

  useEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [measure]);

  return { ref, width, height };
};

/* ── Main component ─────────────────────────────────────────────────────── */

export const UsageBarChart = ({ data, isLoading, onRefresh }: UsageChartSectionProps) => {
  const [segmentMode, setSegmentMode] = useState<BarSegmentMode>("project");
  const [hoveredBar, setHoveredBar] = useState<BarData | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const splitRef = useRef<HTMLDivElement>(null);
  const barPanel = usePanelSize();
  const heatmapPanel = usePanelSize();

  const days = data?.days ?? [];
  const projects = data?.projects ?? [];
  const models = data?.models ?? [];

  const segmentKeys = segmentMode === "model" ? models : projects;

  const maxTokens = useMemo(() => {
    let max = 0;
    for (const d of days) {
      if (d.totalTokens > max) max = d.totalTokens;
    }
    return max;
  }, [days]);

  const totalTokens = useMemo(() => days.reduce((s, d) => s + d.totalTokens, 0), [days]);
  const totalSessions = useMemo(() => days.reduce((s, d) => s + d.sessions, 0), [days]);
  const activeDays = useMemo(() => days.filter((d) => d.totalTokens > 0).length, [days]);

  const bars = useMemo(
    () => buildBars(days, segmentKeys, segmentMode),
    [days, segmentKeys, segmentMode],
  );
  const heatmapBars = useMemo(() => buildBars(days, projects, "project"), [days, projects]);
  const colorMap = useMemo(() => buildColorMap(segmentKeys), [segmentKeys]);

  const stats = useMemo(
    () => buildUsageStats(days, totalTokens, totalSessions, models, projects),
    [days, totalTokens, totalSessions, models, projects],
  );

  return (
    <section className="usage-heatmap" aria-label="Claude token usage chart">
      <header className="usage-heatmap-header">
        <div className="usage-heatmap-header-left">
          <h3>Claude Token Usage</h3>
          <span className="usage-heatmap-summary">
            {formatTokenCount(totalTokens)} tokens across {activeDays} days, {totalSessions}{" "}
            sessions
          </span>
        </div>
        <div className="usage-heatmap-header-actions">
          <ActionButton
            aria-label="Refresh usage chart data"
            className="usage-heatmap-refresh"
            disabled={isLoading}
            onClick={onRefresh}
            size="dense"
            variant="accent"
          >
            {isLoading ? "Scanning..." : "Refresh"}
          </ActionButton>
        </div>
      </header>

      <div
        className="usage-chart-split"
        ref={splitRef}
        onMouseMove={(e) => {
          const rect = splitRef.current?.getBoundingClientRect();
          if (rect) {
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
      >
        <div className="usage-chart-bar-segment-toggle">
          <button
            type="button"
            className={`usage-chart-bar-segment-btn${segmentMode === "project" ? " is-active" : ""}`}
            onClick={() => setSegmentMode("project")}
          >
            Project
          </button>
          <button
            type="button"
            className={`usage-chart-bar-segment-btn${segmentMode === "model" ? " is-active" : ""}`}
            onClick={() => setSegmentMode("model")}
          >
            Model
          </button>
        </div>
        <div className="usage-chart-left-stack">
          <div className="usage-chart-panel" ref={barPanel.ref}>
            <BarChartView
              bars={bars}
              maxTokens={maxTokens}
              containerWidth={barPanel.width}
              containerHeight={barPanel.height}
              hoveredBar={hoveredBar}
              setHoveredBar={setHoveredBar}
            />
          </div>
          {segmentKeys.length > 1 && (
            <div className="usage-chart-legend">
              {segmentKeys.map((key) => (
                <span key={key} className="usage-chart-legend-item">
                  <span
                    className="usage-chart-legend-dot"
                    style={{ backgroundColor: colorMap.get(key) }}
                  />
                  {key}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="usage-chart-right-stack">
          <div className="usage-chart-panel" ref={heatmapPanel.ref}>
            <HeatmapView
              bars={heatmapBars}
              containerWidth={heatmapPanel.width}
              containerHeight={heatmapPanel.height}
              hoveredBar={hoveredBar}
              setHoveredBar={setHoveredBar}
            />
          </div>
          {stats && (
            <dl className="usage-chart-stats">
              <div className="usage-chart-stat">
                <dt>Peak Day</dt>
                <dd>
                  {formatDateLabel(stats.peakDay.date)}
                  <span className="usage-chart-stat-sub">
                    {formatTokenCount(stats.peakDay.totalTokens)}
                  </span>
                </dd>
              </div>
              <div className="usage-chart-stat">
                <dt>Avg / Session</dt>
                <dd>{formatTokenCount(stats.avgPerSession)}</dd>
              </div>
              <div className="usage-chart-stat">
                <dt>Top Model</dt>
                <dd>{stats.topModel}</dd>
              </div>
              <div className="usage-chart-stat">
                <dt>Top Project</dt>
                <dd>{stats.topProject}</dd>
              </div>
              <div className="usage-chart-stat">
                <dt>Best Streak</dt>
                <dd>{stats.maxStreak}d</dd>
              </div>
            </dl>
          )}
        </div>

        {hoveredBar && hoveredBar.totalTokens > 0 && (
          <ChartTooltip
            bar={hoveredBar}
            x={mousePos.x}
            y={mousePos.y}
            containerWidth={splitRef.current?.clientWidth ?? 800}
          />
        )}
      </div>
    </section>
  );
};
