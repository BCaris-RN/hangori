import type { CompanionId, CompanionState } from "@/contracts/index";
import { COMPANIONS, COMPANION_IDS } from "@/domain/companions/roster";
import { STAGE_NAMES } from "@/domain/companions/stages";
import Sprite from "@/ui/Sprite";

export interface DenProps {
  companions: Partial<Record<CompanionId, CompanionState>>;
  activeId: CompanionId | null;
  halloween: boolean;
  onSelect: (id: CompanionId) => void;
  onHatch: (id: CompanionId) => void;
}

/** All five companions: hatched ones are tappable to switch, eggs are tappable to hatch. */
export default function Den({ companions, activeId, halloween, onSelect, onHatch }: DenProps) {
  return (
    <section className="den" aria-labelledby="den-title" data-testid="den">
      <h2 id="den-title" className="section-title">
        Your den
      </h2>
      <ul className="den__grid">
        {COMPANION_IDS.map((id) => {
          const state = companions[id];
          const info = COMPANIONS[id];
          return (
            <li key={id}>
              {state ? (
                <button
                  type="button"
                  className={`den__slot panel ${activeId === id ? "den__slot--active" : ""}`}
                  onClick={() => onSelect(id)}
                  aria-pressed={activeId === id}
                  data-testid={`den-${id}`}
                  data-stage={state.stage}
                >
                  <Sprite id={id} stage={state.stage} halloween={halloween} size={56} motion="none" />
                  <span className="den__name">{info.name}</span>
                  <span className="den__stage">
                    Stage {state.stage} · {STAGE_NAMES[state.stage]}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="den__slot den__slot--egg panel"
                  onClick={() => onHatch(id)}
                  data-testid={`den-${id}`}
                  data-stage="0"
                >
                  <Sprite id={id} stage={0} halloween={halloween} size={56} />
                  <span className="den__name">{info.name}</span>
                  <span className="den__stage">Tap to hatch</span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
