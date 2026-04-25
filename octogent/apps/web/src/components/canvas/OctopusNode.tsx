import type { CSSProperties } from "react";
import { useMemo } from "react";

import type { GraphNode } from "../../app/canvas/types";
import {
  type OctopusAccessory,
  type OctopusAnimation,
  type OctopusExpression,
  OctopusGlyph,
} from "../EmptyOctopus";
import {
  ACCESSORIES,
  ANIMATIONS,
  EXPRESSIONS,
  hashString,
  seededRandom,
} from "../deck/octopusVisuals";

const LINE_MAX = 22;

const splitLabel = (label: string): [string] | [string, string] => {
  if (label.length <= LINE_MAX) return [label];
  const mid = Math.floor(label.length / 2);
  let best = -1;
  for (let i = 0; i < label.length; i++) {
    if (label[i] === " " && (best === -1 || Math.abs(i - mid) < Math.abs(best - mid))) {
      best = i;
    }
  }
  if (best > 0 && best < label.length - 1) {
    const line1 = label.slice(0, best);
    let line2 = label.slice(best + 1);
    if (line2.length > LINE_MAX) line2 = `${line2.slice(0, LINE_MAX - 1)}…`;
    return [line1.length > LINE_MAX ? `${line1.slice(0, LINE_MAX - 1)}…` : line1, line2];
  }
  return [
    `${label.slice(0, LINE_MAX - 1)}…`,
    label.slice(LINE_MAX - 1, LINE_MAX * 2 - 2) + (label.length > LINE_MAX * 2 - 2 ? "…" : ""),
  ];
};

type OctopusVisuals = {
  animation: OctopusAnimation;
  expression: OctopusExpression;
  accessory: OctopusAccessory;
  hairColor?: string | undefined;
};

function deriveOctopusVisuals(node: GraphNode): OctopusVisuals {
  const rng = seededRandom(hashString(node.tentacleId));
  const stored = node.octopus;
  return {
    animation:
      (stored?.animation as OctopusAnimation | null) ??
      (ANIMATIONS[Math.floor(rng() * ANIMATIONS.length)] as OctopusAnimation),
    expression:
      (stored?.expression as OctopusExpression | null) ??
      (EXPRESSIONS[Math.floor(rng() * EXPRESSIONS.length)] as OctopusExpression),
    accessory:
      (stored?.accessory as OctopusAccessory | null) ??
      (ACCESSORIES[Math.floor(rng() * ACCESSORIES.length)] as OctopusAccessory),
    hairColor: stored?.hairColor ?? undefined,
  };
}

type OctopusNodeProps = {
  node: GraphNode;
  connectedNodes: GraphNode[];
  isSelected: boolean;
  selectedNodeId: string | null;
  selectedNodeColor: string | null;
  // Modo Consultor: estado del tentáculo como "tool". Cuando se setea, el
  // nodo aplica clases de glow específicas (active = pintado con su color
  // propio, idle = atenuado y desaturado).
  consultorToolState?: "idle" | "done" | "current" | undefined;
  onPointerDown: (e: React.PointerEvent, nodeId: string) => void;
  onClick: (nodeId: string) => void;
};

const buildEdgePath = (
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  targetRadius: number,
  edgeIndex: number,
  edgeCount: number,
): string => {
  const dx = tx - cx;
  const dy = ty - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return "";

  // Shorten the endpoint so the edge stops at the target node's border
  const shortenBy = targetRadius + 2;
  const endRatio = Math.max(0, (dist - shortenBy) / dist);
  const etx = cx + dx * endRatio;
  const ety = cy + dy * endRatio;

  // Curvature — perpendicular offset for quadratic Bézier control point
  // Single edges get a default curve; multi-edges fan out
  const curvature = edgeCount <= 1 ? 0.3 : (edgeIndex / (edgeCount - 1) - 0.5) * 2;
  const offsetRatio = 0.25 + edgeCount * 0.05;
  const baseOffset = Math.max(35, dist * offsetRatio);

  // Perpendicular to source→target direction (unit normal: -dy/dist, dx/dist)
  const offsetX = (-dy / dist) * curvature * baseOffset;
  const offsetY = (dx / dist) * curvature * baseOffset;
  const cpx = (cx + etx) / 2 + offsetX;
  const cpy = (cy + ety) / 2 + offsetY;

  return `M ${cx} ${cy} Q ${cpx} ${cpy} ${etx} ${ety}`;
};

const GLYPH_SCALE = 4;
const GLYPH_W = 112;
const GLYPH_H = 120;

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

export const OctopusNode = ({
  node,
  connectedNodes,
  isSelected,
  selectedNodeId,
  selectedNodeColor,
  consultorToolState,
  onPointerDown,
  onClick,
}: OctopusNodeProps) => {
  const showFocus = isSelected;
  const isOctoboss = node.type === "octoboss";
  const lines = useMemo(() => splitLabel(node.label), [node.label]);
  const visuals = useMemo(
    () =>
      isOctoboss
        ? ({ animation: "sway", expression: "normal", accessory: "none" } as OctopusVisuals)
        : deriveOctopusVisuals(node),
    [node, isOctoboss],
  );
  const glyphScale = isOctoboss ? 6 : GLYPH_SCALE;
  const glyphW = Math.round(GLYPH_W * (glyphScale / GLYPH_SCALE));
  const glyphH = Math.round(GLYPH_H * (glyphScale / GLYPH_SCALE));
  const color = node.color;

  const isConsultorNode = node.type === "tentacle" && node.tentacleId.startsWith("consultor-");
  // Tres estados visuales: idle (gris), done (color sólido sin pulse) y
  // current (color + pulse + glow). Solo una tool puede estar "current"
  // a la vez — la lógica vive en useConsultorActiveTools.
  const consultorStateClass = isConsultorNode
    ? consultorToolState === "current"
      ? "octopus-node--consultor-current"
      : consultorToolState === "done"
        ? "octopus-node--consultor-done"
        : "octopus-node--consultor-idle"
    : null;
  const nodeClassName = [
    "canvas-node",
    "canvas-node--tentacle",
    showFocus && "canvas-node--selected",
    isConsultorNode && "octopus-node--consultor",
    consultorStateClass,
  ]
    .filter(Boolean)
    .join(" ");
  // Inyectamos el color propio del tentáculo como custom property para que
  // el glow del estado "active" lo use sin depender de selectores duros por
  // tentacleId. Cuando está idle no se pinta.
  // Tanto "current" como "done" usan el color del tentáculo para el filter
  // (drop-shadow / brillo). "idle" ignora el color y aplica grayscale.
  const consultorStyle =
    isConsultorNode && (consultorToolState === "current" || consultorToolState === "done")
      ? ({
          ["--consultor-glow-inner" as string]: color,
          ["--consultor-glow-outer" as string]: `${color}80`,
        } as CSSProperties)
      : undefined;

  const mergedStyle: CSSProperties = { cursor: "grab", ...consultorStyle };

  return (
    <g
      className={nodeClassName}
      data-node-id={node.id}
      transform={`translate(${node.x}, ${node.y})`}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onPointerDown(e, node.id);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(node.id);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        onClick(node.id);
      }}
      style={mergedStyle}
    >
      {/* Invisible hit area for pointer events */}
      <rect x={-glyphW / 2} y={-glyphH / 2} width={glyphW} height={glyphH} fill="transparent" />

      {/* Edges — highlight when either endpoint is selected */}
      {connectedNodes.map((target) => {
        const active = isSelected || target.id === selectedNodeId;
        const path = buildEdgePath(0, 0, target.x - node.x, target.y - node.y, target.radius, 0, 1);
        return (
          <g key={target.id}>
            <path
              className="canvas-edge"
              d={path}
              fill="none"
              stroke={active ? (selectedNodeColor ?? color) : "#C0C0C0"}
              strokeWidth={active ? 2 : 1.5}
              strokeOpacity={1}
            />
            {isEdgeActivityVisible(target)
              ? renderEdgeActivityDots(
                  path,
                  active ? (selectedNodeColor ?? color) : color,
                  target.id,
                )
              : null}
          </g>
        );
      })}

      {/* Focused glow — same style as session nodes */}
      {showFocus && <circle className="canvas-node-focus-glow" r={node.radius - 4} fill={color} />}

      {/* Octopus glyph via foreignObject */}
      <foreignObject
        x={-glyphW / 2}
        y={-glyphH / 2}
        width={glyphW}
        height={glyphH}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <OctopusGlyph
            {...(isOctoboss ? {} : { color })}
            animation={visuals.animation}
            expression={visuals.expression}
            accessory={visuals.accessory}
            {...(visuals.hairColor ? { hairColor: visuals.hairColor } : {})}
            scale={glyphScale}
          />
        </div>
      </foreignObject>

      {/* Label — always visible, up to two lines */}
      <text
        y={glyphH / 2 - 12}
        textAnchor="middle"
        className="canvas-node-label canvas-node-label--tentacle canvas-node-label--always"
        fill={isOctoboss ? "var(--accent-primary, #d4a017)" : "#faa32c"}
      >
        <tspan x="0" dy="0">
          {lines[0]}
        </tspan>
        {lines[1] && (
          <tspan x="0" dy="1.2em">
            {lines[1]}
          </tspan>
        )}
      </text>
    </g>
  );
};
