import { stageProgress, type Stage } from "@/domain/companions/stages";

export interface XpBarProps {
  xp: number;
  stage: Stage;
}

/** XP toward the next evolution stage. Full at the top stage. */
export default function XpBar({ xp, stage }: XpBarProps) {
  const { fraction, to } = stageProgress({ xp, stage });
  const label = to === null ? `${xp} XP · top stage` : `${xp} / ${to} XP`;
  return (
    <div
      className="xpbar"
      role="progressbar"
      aria-label="XP toward the next stage"
      aria-valuemin={0}
      aria-valuemax={to ?? xp}
      aria-valuenow={xp}
      data-testid="xp-bar"
      data-xp={xp}
    >
      <div className="xpbar__fill" style={{ width: `${Math.round(fraction * 100)}%` }} />
      <span className="xpbar__label">{label}</span>
    </div>
  );
}
