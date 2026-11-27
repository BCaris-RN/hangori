import { useEffect, useState } from "react";
import type { CompanionId } from "@/contracts/index";
import { COMPANIONS } from "@/domain/companions/roster";
import Sprite from "@/ui/Sprite";

export interface HatchSceneProps {
  id: CompanionId;
  halloween: boolean;
  onDone: () => void;
}

/** The egg shakes, cracks, and the stage 1 companion appears. Tap to skip ahead. */
export default function HatchScene({ id, halloween, onDone }: HatchSceneProps) {
  const [phase, setPhase] = useState<"shake" | "burst" | "born">("shake");
  const info = COMPANIONS[id];

  useEffect(() => {
    const burst = setTimeout(() => setPhase("burst"), 1300);
    const born = setTimeout(() => setPhase("born"), 1600);
    const done = setTimeout(onDone, 3000);
    return () => {
      clearTimeout(burst);
      clearTimeout(born);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <section className="hatch panel" data-testid="hatch-scene" data-phase={phase} aria-live="polite">
      <div className={`hatch__stage hatch__stage--${phase}`}>
        {phase === "born" ? (
          <Sprite id={id} stage={1} halloween={halloween} size={176} />
        ) : (
          <Sprite id={id} stage={0} halloween={halloween} size={176} />
        )}
      </div>
      <p className="hatch__text">
        {phase === "born" ? `${info.name} the ${info.species} hatched!` : `${info.name}'s egg is hatching...`}
      </p>
      <button type="button" className="btn" onClick={onDone} data-testid="hatch-continue">
        {phase === "born" ? "Say hello" : "Skip"}
      </button>
    </section>
  );
}
