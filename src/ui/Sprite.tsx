import { useMemo } from "react";
import type { CompanionId } from "@/contracts/index";
import { COMPANIONS } from "@/domain/companions/roster";
import { GRID, spriteCells, type SpriteStage } from "./sprites";

export interface SpriteProps {
  id: CompanionId;
  /** 0 draws the unhatched egg. */
  stage: SpriteStage;
  halloween: boolean;
  /** Width and height in CSS pixels. */
  size?: number;
  /** "idle" bobs, "eat" chomps, "none" is still. */
  motion?: "idle" | "eat" | "none";
  className?: string;
}

export default function Sprite({ id, stage, halloween, size = 96, motion = "idle", className = "" }: SpriteProps) {
  const { cells, orbit } = useMemo(() => spriteCells(id, stage, halloween), [id, stage, halloween]);
  const label =
    stage === 0 ? `${COMPANIONS[id].name}'s egg` : `${COMPANIONS[id].name} the ${COMPANIONS[id].species}, stage ${stage}`;
  const classes = [
    "sprite",
    stage === 0 ? "sprite--egg" : `sprite--motion-${motion}`,
    halloween ? "sprite--halloween" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
      data-stage={stage}
      data-halloween={halloween}
    >
      <g className="sprite__body">
        {cells.map((c) => (
          <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={c.fill} />
        ))}
      </g>
      {orbit.length > 0 && (
        <g className="sprite__orbit">
          {orbit.map((c) => (
            <rect key={`o${c.x}-${c.y}`} x={c.x} y={c.y} width={1} height={1} fill={c.fill} />
          ))}
        </g>
      )}
    </svg>
  );
}
