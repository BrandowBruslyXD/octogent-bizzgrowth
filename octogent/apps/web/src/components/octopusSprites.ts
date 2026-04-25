/*
 * Pure sprite data, drawing helpers, and animation logic for the pixel-art octopus.
 * Extracted here so EmptyOctopus.tsx stays under the 500-line module limit while
 * keeping all canvas math in one place.
 *
 * Nothing in this file depends on React — it is safe to import from any context.
 */

export const DEFAULT_SCALE = 14;
export const BOUNCE_PAD = 2;
// Extra rows above the sprite for overlays (ZZZ, accessories).
export const ZZZ_PAD = 7;
export const ACCESSORY_PAD = 4;
const ZZZ_COLOR = "#7ec8e3";
export const HAIR_COLOR = "#4a2c0a";

const B = "B";
const O = "O";
const E = "E";
const _ = "";

// ─── HEAD construction ───────────────────────────────────────────────────────
// Rows 0-2 and 6-9 are identical across all expressions.
// Rows 3-5 carry the expression detail; buildHead() assembles the full array.

// prettier-ignore
const HEAD_TOP: string[][] = [
  [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
  [_, _, _, O, B, B, B, B, B, B, B, B, O, _, _, _],
  [_, _, O, B, B, B, B, B, B, B, B, B, B, O, _, _],
];

// Angry variant — outer brow pixel at col 4 (left) and col 11 (right) in row 2.
// Combined with FACE_ANGRY row 3 inner pixels (col 5 / col 10), this forms a
// diagonal V-slash brow: outer-high → inner-low on each side.
// prettier-ignore
const HEAD_TOP_ANGRY: string[][] = [
  [_, _, _, _, O, O, O, O, O, O, O, O, _, _, _, _],
  [_, _, _, O, B, B, B, B, B, B, B, B, O, _, _, _],
  [_, _, O, B, O, B, B, B, B, B, B, O, B, O, _, _],
];

// prettier-ignore
const HEAD_BODY: string[][] = [
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
];

// Happy — open mouth: solid black rectangle in rows 7-8, cols 5-10.
// prettier-ignore
const HEAD_BODY_HAPPY: string[][] = [
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, B, O, O, O, O, O, O, O, B, B, O, _],
  [_, O, B, B, B, O, O, O, O, O, O, O, B, B, O, _],
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
];

// Angry — open mouth, narrower than happy to read as a shout/snarl.
// prettier-ignore
const HEAD_BODY_ANGRY: string[][] = [
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, B, B, O, O, O, O, O, B, B, B, O, _],
  [_, O, B, B, B, B, O, O, O, O, O, B, B, B, O, _],
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
];

// Normal — 2×2 square eyes (rows 4-5).
// prettier-ignore
const FACE_NORMAL: string[][] = [
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, E, E, B, B, B, B, E, E, B, B, O, _],
  [_, O, B, B, E, E, B, B, B, B, E, E, B, B, O, _],
];

// Happy — upward-curved eyes (^_^ style): bottom row lit, top row clear.
// The open space above the pupil makes the eye read as curving upward = smile.
// prettier-ignore
const FACE_HAPPY: string[][] = [
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, E, E, B, B, B, B, E, E, B, B, O, _],
];

// Sleepy — heavy eyelid (solid outline stripe) with tiny pupils peeking below.
// prettier-ignore
const FACE_SLEEPY: string[][] = [
  [_, O, B, B, B, B, B, B, B, B, B, B, B, B, O, _],
  [_, O, B, B, O, O, B, B, B, B, O, O, B, B, O, _],
  [_, O, B, B, E, B, B, B, B, B, B, E, B, B, O, _],
];

// Angry — brow diagonal continues: outer pixel lands at col 4/11 here too,
// making a 2-pixel-wide brow that reads clearly as a hard scowl.
// prettier-ignore
const FACE_ANGRY: string[][] = [
  [_, O, B, O, O, B, B, B, B, B, B, O, O, B, O, _],
  [_, O, B, B, E, E, B, B, B, B, E, E, B, B, O, _],
  [_, O, B, B, E, E, B, B, B, B, E, E, B, B, O, _],
];

// Surprised — eyes extend up into row 3, making them taller (3-row tall eyes).
// prettier-ignore
const FACE_SURPRISED: string[][] = [
  [_, O, B, B, E, E, B, B, B, B, E, E, B, B, O, _],
  [_, O, B, B, E, E, B, B, B, B, E, E, B, B, O, _],
  [_, O, B, B, E, E, B, B, B, B, E, E, B, B, O, _],
];

function buildHead(
  face: string[][],
  topRows: string[][] = HEAD_TOP,
  bodyRows: string[][] = HEAD_BODY,
): string[][] {
  return [...topRows, ...face, ...bodyRows];
}

// ─── Tentacle / tail variants ────────────────────────────────────────────────

// prettier-ignore
const TENTACLE_TOP: string[][] = [[_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _]];

// prettier-ignore
const TAIL_NEUTRAL: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, O, _, _, _, O, O, _, _, _, O, O, _, _],
];

// Legs bend right — top row stays anchored, lower rows shift 1px right.
// prettier-ignore
const TAIL_RIGHT: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, B, B, O, _, O, B, B, O, _, O, B, B, O],
  [_, _, _, O, O, _, _, _, O, O, _, _, _, O, O, _],
];

// Legs bend left — top row stays anchored, lower rows shift 1px left.
// prettier-ignore
const TAIL_LEFT: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [O, B, B, O, _, O, B, B, O, _, O, B, B, O, _, _],
  [_, O, O, _, _, _, O, O, _, _, _, O, O, _, _, _],
];

// Sway: center → right → center → left → repeat
const SWAY_FRAMES_TAILS = [TAIL_NEUTRAL, TAIL_RIGHT, TAIL_NEUTRAL, TAIL_LEFT];

// Walk-up: all three legs extend and retract in unison.
// prettier-ignore
const WALKUP_0: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, O, _, _, _, O, O, _, _, _, O, O, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];
// prettier-ignore
const WALKUP_1: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, O, _, _, _, O, O, _, _, _, O, O, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];
// prettier-ignore
const WALKUP_2: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, O, _, _, _, O, O, _, _, _, O, O, _, _],
];
// prettier-ignore
const WALKUP_3: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, O, _, _, _, O, O, _, _, _, O, O, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];
const WALKUP_FRAMES = [WALKUP_0, WALKUP_1, WALKUP_2, WALKUP_3];

// ─── Types ───────────────────────────────────────────────────────────────────

export type SpriteFrame = {
  bottom: string[][];
  /** Shift the sprite down by this many pixels (0..BOUNCE_PAD). */
  yOffset?: number;
};

export type OctopusAnimation = "idle" | "sway" | "walk" | "jog" | "swim-up" | "bounce" | "float";
// "sleepy" is reserved for idle/inactive tentacles — never assign it randomly on creation.
export type OctopusExpression = "normal" | "happy" | "sleepy" | "angry" | "surprised";
export type OctopusAccessory = "none" | "long" | "mohawk" | "side-sweep" | "curly";

// ─── Walk frames ─────────────────────────────────────────────────────────────

// prettier-ignore
const WALK_S0: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, O, _, _, _, O, O, _, _, _, O, O, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

// Outer legs kick right, middle kicks left.
// prettier-ignore
const WALK_S1: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, B, O, _, O, B, O, _, _, _, O, B, O, _],
  [_, _, _, O, O, _, O, O, _, _, _, _, _, O, O, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

// Outer legs kick left, middle kicks right — mirror of S1.
// prettier-ignore
const WALK_S3: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, O, B, O, _, _, _, O, B, O, _, O, B, O, _, _],
  [_, O, O, _, _, _, _, _, O, O, _, O, O, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

const JOG_FRAMES: SpriteFrame[] = [
  { bottom: WALK_S0, yOffset: 1 },
  { bottom: WALK_S1, yOffset: 0 },
  { bottom: WALK_S0, yOffset: 1 },
  { bottom: WALK_S3, yOffset: 0 },
];

// Walk: wave stride — motion ripples across tentacles left → right.

// Frame 0: L=bent, M=neutral, R=mid
// prettier-ignore
const WALK_WAVE_0: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, _, B, B, _, _, B, B, _, _, _, _, B, B, _],
  [_, _, _, O, B, O, O, B, B, O, _, O, B, B, O, _],
  [_, _, _, _, O, O, _, O, O, _, _, _, O, O, _, _],
];

// Frame 1: M=bent, L=mid, R=neutral
// prettier-ignore
const WALK_WAVE_1: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, _, B, B, _, _, _, B, B, _, _, B, B, _, _],
  [_, O, B, B, O, _, _, _, O, B, O, O, B, B, O, _],
  [_, _, O, O, _, _, _, _, _, O, O, _, O, O, _, _],
];

// Frame 2: R=bent, M=mid, L=neutral
// prettier-ignore
const WALK_WAVE_2: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, B, B, _, _, _, _, B, B, _, _, _, B, B, _],
  [_, O, B, B, O, _, O, B, B, O, _, _, _, O, B, O],
  [_, _, O, O, _, _, _, O, O, _, _, _, _, _, O, O],
];

const WALK_FRAMES: SpriteFrame[] = [
  { bottom: WALK_WAVE_0 },
  { bottom: WALK_WAVE_1 },
  { bottom: WALK_WAVE_2 },
];

// ─── Bounce / float animations ───────────────────────────────────────────────

const BOUNCE_STRAIGHT = [...TENTACLE_TOP, ...TAIL_NEUTRAL];

// Crouch — outer legs splay outward, coiling to jump.
// prettier-ignore
const BOUNCE_CROUCH: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, O, B, O, _, _, O, B, B, O, _, _, O, B, O, _],
  [_, O, O, _, _, _, _, O, O, _, _, _, _, O, O, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

// Apex — legs tuck short (retracted), airborne.
// prettier-ignore
const BOUNCE_TUCKED: string[][] = [
  [_, O, B, B, O, _, O, B, B, O, _, O, B, B, O, _],
  [_, _, O, O, _, _, _, O, O, _, _, _, O, O, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

const BOUNCE_FRAMES: SpriteFrame[] = [
  { bottom: BOUNCE_CROUCH, yOffset: 2 },
  { bottom: BOUNCE_STRAIGHT, yOffset: 1 },
  { bottom: BOUNCE_TUCKED, yOffset: 0 },
  { bottom: BOUNCE_STRAIGHT, yOffset: 1 },
];

// Float: slow buoyancy — dwell longer at top and bottom.
const FLOAT_FRAMES: SpriteFrame[] = [
  { bottom: BOUNCE_STRAIGHT, yOffset: 0 },
  { bottom: BOUNCE_STRAIGHT, yOffset: 0 },
  { bottom: BOUNCE_STRAIGHT, yOffset: 1 },
  { bottom: BOUNCE_STRAIGHT, yOffset: 2 },
  { bottom: BOUNCE_STRAIGHT, yOffset: 2 },
  { bottom: BOUNCE_STRAIGHT, yOffset: 1 },
];

// ─── Frame timing ────────────────────────────────────────────────────────────

const JOG_FRAME_MS = 220;
const WALK_FRAME_MS = 320;
export const SWAY_FRAME_MS = 350;
const FLOAT_FRAME_MS = 420;

// ─── Sprite dimensions ───────────────────────────────────────────────────────

export const SPRITE_W = 16;
// HEAD_TOP(3) + face(3) + HEAD_BODY(4) + TENTACLE_TOP(1) + TAIL_NEUTRAL(3) = 14
export const SPRITE_H =
  HEAD_TOP.length +
  FACE_NORMAL.length +
  HEAD_BODY.length +
  TENTACLE_TOP.length +
  TAIL_NEUTRAL.length;

// ─── Head lookup ─────────────────────────────────────────────────────────────

export const HEADS: Record<OctopusExpression, string[][]> = {
  normal: buildHead(FACE_NORMAL),
  happy: buildHead(FACE_HAPPY, HEAD_TOP, HEAD_BODY_HAPPY),
  sleepy: buildHead(FACE_SLEEPY),
  angry: buildHead(FACE_ANGRY, HEAD_TOP_ANGRY, HEAD_BODY_ANGRY),
  surprised: buildHead(FACE_SURPRISED),
};

export const IDLE_FRAME: SpriteFrame = { bottom: [...TENTACLE_TOP, ...TAIL_NEUTRAL] };

// ─── Drawing ─────────────────────────────────────────────────────────────────

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  accentColor: string,
  frame: SpriteFrame,
  head: string[][],
  scale: number,
  topPad: number,
) {
  ctx.clearRect(0, 0, SPRITE_W * scale, (topPad + SPRITE_H + BOUNCE_PAD) * scale);

  const yOff = (frame.yOffset ?? 0) + topPad;
  const layers = [...head, ...frame.bottom];
  for (let y = 0; y < layers.length; y++) {
    const row = layers[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (!cell) continue;
      ctx.fillStyle = cell === E || cell === O ? "#000000" : accentColor;
      ctx.fillRect(x * scale, (y + yOff) * scale, scale, scale);
    }
  }
}

// Three 3×5 Z glyphs staggered rising right→left above the sprite.
// Phase 0: Z1 only · Phase 1: all three · Phase 2-3: hidden.
export function drawZZZ(ctx: CanvasRenderingContext2D, scale: number, zzzPhase: number) {
  if (zzzPhase >= 3) return;

  ctx.fillStyle = ZZZ_COLOR;

  // prettier-ignore
  const Z1: Array<[number, number]> = [
    [13, 2],
    [14, 2],
    [15, 2],
    [15, 3],
    [14, 4],
    [13, 5],
    [13, 6],
    [14, 6],
    [15, 6],
  ];

  // prettier-ignore
  const Z2: Array<[number, number]> = [
    [9, 1],
    [10, 1],
    [11, 1],
    [11, 2],
    [10, 3],
    [9, 4],
    [9, 5],
    [10, 5],
    [11, 5],
  ];

  // prettier-ignore
  const Z3: Array<[number, number]> = [
    [5, 0],
    [6, 0],
    [7, 0],
    [7, 1],
    [6, 2],
    [5, 3],
    [5, 4],
    [6, 4],
    [7, 4],
  ];

  const pixels = zzzPhase === 0 ? Z1 : zzzPhase === 1 ? [...Z1, ...Z2] : [...Z1, ...Z2, ...Z3];
  for (const [x, y] of pixels) {
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }
}

// Draw accessory as smooth vector shapes on top of the pixel sprite.
// Dome top-center is at sprite pixel (8, 0) — used as anchor for all accessories.
export function drawAccessory(
  ctx: CanvasRenderingContext2D,
  accessory: OctopusAccessory,
  scale: number,
  yOff: number,
  hColor: string,
) {
  if (accessory === "none") return;

  const domeL = 4 * scale;
  const domeR = 12 * scale;
  const domeCX = 8 * scale;
  const domeTop = yOff * scale;
  const domeW = domeR - domeL;

  ctx.save();
  ctx.fillStyle = hColor;

  switch (accessory) {
    case "long": {
      const hairTop = domeTop - scale * 1.5;
      const strandEnd = domeTop + scale * 10.5;
      const bangY = domeTop + scale * 2.5;
      const lOut = scale * 0.5;
      const lIn = domeL;
      const rIn = domeR;
      const rOut = scale * 15.5;

      ctx.beginPath();
      ctx.moveTo(domeCX, hairTop);
      ctx.quadraticCurveTo(lOut, hairTop, lOut, domeTop + scale * 2);
      ctx.lineTo(lOut, strandEnd);
      ctx.lineTo(lIn, strandEnd);
      ctx.lineTo(lIn, bangY);
      ctx.lineTo(lIn + scale * 1.5, bangY + scale * 1.8);
      ctx.lineTo(domeCX - scale * 0.5, bangY + scale * 0.5);
      ctx.lineTo(domeCX, bangY + scale * 1.2);
      ctx.lineTo(domeCX + scale * 0.5, bangY + scale * 0.5);
      ctx.lineTo(rIn - scale * 1.5, bangY + scale * 1.8);
      ctx.lineTo(rIn, bangY);
      ctx.lineTo(rIn, strandEnd);
      ctx.lineTo(rOut, strandEnd);
      ctx.lineTo(rOut, domeTop + scale * 2);
      ctx.quadraticCurveTo(rOut, hairTop, domeCX, hairTop);
      ctx.closePath();

      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = scale * 0.6;
      ctx.stroke();
      ctx.fill();
      break;
    }
    case "mohawk": {
      const baseY = domeTop + scale * 0.3;
      const spikes: Array<[number, number, number]> = [
        [domeCX - domeW * 0.15, domeTop - scale * 2, domeW * 0.2],
        [domeCX, domeTop - scale * 3.2, domeW * 0.22],
        [domeCX + domeW * 0.18, domeTop - scale * 2.2, domeW * 0.2],
      ];
      for (const [cx, tipY, halfW] of spikes) {
        ctx.beginPath();
        ctx.moveTo(cx - halfW, baseY);
        ctx.lineTo(cx, tipY);
        ctx.lineTo(cx + halfW, baseY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(domeCX, baseY, domeW * 0.35, scale * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "side-sweep": {
      ctx.beginPath();
      ctx.moveTo(domeCX + domeW * 0.2, domeTop + scale * 0.5);
      ctx.quadraticCurveTo(domeCX, domeTop - scale * 2, domeL - scale * 1.5, domeTop - scale * 0.5);
      ctx.quadraticCurveTo(
        domeL - scale * 2,
        domeTop + scale * 1.5,
        domeL - scale * 1,
        domeTop + scale * 3,
      );
      ctx.quadraticCurveTo(domeL - scale * 0.2, domeTop + scale * 2, domeL, domeTop + scale * 0.5);
      ctx.quadraticCurveTo(
        domeCX,
        domeTop + scale * 0.2,
        domeCX + domeW * 0.2,
        domeTop + scale * 0.5,
      );
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "curly": {
      const r = domeW * 0.18;
      const centers: Array<[number, number]> = [
        [domeCX - domeW * 0.5, domeTop + scale * 1.2],
        [domeCX - domeW * 0.25, domeTop + scale * 1.2],
        [domeCX, domeTop + scale * 1.2],
        [domeCX + domeW * 0.25, domeTop + scale * 1.2],
        [domeCX + domeW * 0.5, domeTop + scale * 1.2],
        [domeCX - domeW * 0.5, domeTop + scale * 0.3],
        [domeCX - domeW * 0.2, domeTop + scale * 0.3],
        [domeCX + domeW * 0.2, domeTop + scale * 0.3],
        [domeCX + domeW * 0.5, domeTop + scale * 0.3],
        [domeCX - domeW * 0.4, domeTop - scale * 0.3],
        [domeCX - domeW * 0.12, domeTop - scale * 0.3],
        [domeCX + domeW * 0.12, domeTop - scale * 0.3],
        [domeCX + domeW * 0.4, domeTop - scale * 0.3],
        [domeCX - domeW * 0.3, domeTop - scale * 1.1],
        [domeCX, domeTop - scale * 1.1],
        [domeCX + domeW * 0.3, domeTop - scale * 1.1],
        [domeCX - domeW * 0.18, domeTop - scale * 1.8],
        [domeCX + domeW * 0.18, domeTop - scale * 1.8],
        [domeCX, domeTop - scale * 2.4],
      ];
      for (const [cx, cy] of centers) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
}

// ─── Animation builder ───────────────────────────────────────────────────────

export function buildFrameSequence(animation: OctopusAnimation): SpriteFrame[] {
  switch (animation) {
    case "swim-up":
      return WALKUP_FRAMES.map((bottom) => ({ bottom }));
    case "walk":
      return WALK_FRAMES;
    case "jog":
      return JOG_FRAMES;
    case "bounce":
      return BOUNCE_FRAMES;
    case "float":
      return FLOAT_FRAMES;
    default:
      return SWAY_FRAMES_TAILS.map((tail) => ({ bottom: [...TENTACLE_TOP, ...tail] }));
  }
}

export function animationFrameMs(animation: OctopusAnimation): number {
  if (animation === "jog" || animation === "swim-up") return JOG_FRAME_MS;
  if (animation === "walk") return WALK_FRAME_MS;
  if (animation === "float") return FLOAT_FRAME_MS;
  return SWAY_FRAME_MS;
}
