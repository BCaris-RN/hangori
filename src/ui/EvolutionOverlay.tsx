import { useEffect, useState } from "react";
import type { CompanionId } from "@/contracts/index";
import { COMPANIONS } from "@/domain/companions/roster";
import { STAGE_NAMES, type Stage } from "@/domain/companions/stages";
import Sprite from "./Sprite";

export interface EvolutionOverlayProps {
  id: CompanionId;
  fromStage: Stage;
  toStage: Stage;
  halloween: boolean;
  onClose: () => void;
}

/** Full-screen evolution moment: the old form, a flash, then the new form. */
export default function EvolutionOverlay({ id, fromStage, toStage, halloween, onClose }: EvolutionOverlayProps) {
  const [evolved, setEvolved] = useState(false);
  const info = COMPANIONS[id];

  useEffect(() => {
    const timer = setTimeout(() => setEvolved(true), 1100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`${info.name} is evolving`} data-testid="evolution-overlay">
      <div className="overlay__card panel">
        <p className="overlay__kicker">{evolved ? "Evolved!" : "Something is happening..."}</p>
        <div className={`overlay__stage ${evolved ? "overlay__stage--flash" : ""}`}>
          <Sprite id={id} stage={evolved ? toStage : fromStage} halloween={halloween} size={192} />
        </div>
        <h2 className="overlay__title">
          {info.name} became a {STAGE_NAMES[toStage]}
        </h2>
        <p className="overlay__sub">
          Stage {fromStage} to stage {toStage}
          {halloween ? " · Halloween form" : ""}
        </p>
        <button type="button" className="btn btn--primary" onClick={onClose} data-testid="evolution-continue">
          Meet your {STAGE_NAMES[toStage]}
        </button>
      </div>
    </div>
  );
}
