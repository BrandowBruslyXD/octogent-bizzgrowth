import { useEffect, useRef } from "react";

import {
  ACCESSORY_PAD,
  BOUNCE_PAD,
  DEFAULT_SCALE,
  HAIR_COLOR,
  HEADS,
  IDLE_FRAME,
  SPRITE_H,
  SPRITE_W,
  SWAY_FRAME_MS,
  ZZZ_PAD,
  animationFrameMs,
  buildFrameSequence,
  drawAccessory,
  drawSprite,
  drawZZZ,
} from "./octopusSprites";

export type { OctopusAccessory, OctopusAnimation, OctopusExpression } from "./octopusSprites";

// ─── Component ───────────────────────────────────────────────────────────────

type OctopusGlyphProps = {
  animation?: import("./octopusSprites").OctopusAnimation;
  expression?: import("./octopusSprites").OctopusExpression;
  accessory?: import("./octopusSprites").OctopusAccessory;
  /** Hair color override. Default: dark brown. */
  hairColor?: string;
  /** Override the pixel scale (CSS px per sprite pixel). Default: 14. */
  scale?: number;
  className?: string;
  color?: string;
  testId?: string;
};

export const OctopusGlyph = ({
  animation = "sway",
  expression = "normal",
  accessory = "none",
  hairColor = HAIR_COLOR,
  scale = DEFAULT_SCALE,
  className,
  color,
  testId,
}: OctopusGlyphProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const zzzPhaseRef = useRef(0);

  // Extra canvas rows above the sprite for overlays (ZZZ, accessories).
  const topPad = Math.max(
    expression === "sleepy" ? ZZZ_PAD : 0,
    accessory !== "none" ? ACCESSORY_PAD : 0,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const accentColor =
      color ??
      (getComputedStyle(document.documentElement).getPropertyValue("--accent-primary").trim() ||
        "#d4a017");

    const head = HEADS[expression];

    const drawFrame = (frame: import("./octopusSprites").SpriteFrame, zzzPhase: number) => {
      drawSprite(ctx, accentColor, frame, head, scale, topPad);
      if (expression === "sleepy") drawZZZ(ctx, scale, zzzPhase);
      const yOff = (frame.yOffset ?? 0) + topPad;
      drawAccessory(ctx, accessory, scale, yOff, hairColor);
    };

    // Idle with no ZZZ: static, no interval.
    if (animation === "idle" && expression !== "sleepy") {
      frameRef.current = 0;
      drawFrame(IDLE_FRAME, 0);
      return;
    }

    // Idle sleepy: sprite is static but ZZZ blinks — use sway timing for ZZZ cycle.
    const frames = animation === "idle" ? null : buildFrameSequence(animation);
    const ms = animation === "idle" ? SWAY_FRAME_MS : animationFrameMs(animation);

    frameRef.current = 0;
    zzzPhaseRef.current = 0;
    drawFrame(frames?.[0] ?? IDLE_FRAME, 0);

    const id = setInterval(() => {
      if (frames) {
        frameRef.current = (frameRef.current + 1) % frames.length;
      }
      zzzPhaseRef.current = (zzzPhaseRef.current + 1) % 5;
      drawFrame(frames?.[frameRef.current] ?? IDLE_FRAME, zzzPhaseRef.current);
    }, ms);

    return () => clearInterval(id);
  }, [animation, expression, accessory, hairColor, color, scale, topPad]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      width={SPRITE_W * scale}
      height={(topPad + SPRITE_H + BOUNCE_PAD) * scale}
      data-testid={testId}
    />
  );
};
