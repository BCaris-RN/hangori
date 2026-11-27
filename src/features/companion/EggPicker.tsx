import type { CompanionId } from "@/contracts/index";
import { COMPANIONS, COMPANION_IDS } from "@/domain/companions/roster";
import Sprite from "@/ui/Sprite";

export interface EggPickerProps {
  halloween: boolean;
  onPick: (id: CompanionId) => void;
  onLoadDemo: () => void;
}

export default function EggPicker({ halloween, onPick, onLoadDemo }: EggPickerProps) {
  return (
    <section className="picker" data-testid="egg-picker" aria-labelledby="picker-title">
      <h2 id="picker-title" className="section-title">
        Pick your companion
      </h2>
      <p className="lede">Each one hatches from an egg, eats when you log a real meal, and evolves as it levels up.</p>
      <ul className="picker__grid">
        {COMPANION_IDS.map((id) => (
          <li key={id}>
            <button type="button" className="egg-card panel" onClick={() => onPick(id)} data-testid={`pick-${id}`}>
              <Sprite id={id} stage={0} halloween={halloween} size={64} />
              <span className="egg-card__name">{COMPANIONS[id].name}</span>
              <span className="egg-card__species">{COMPANIONS[id].species}</span>
              <span className="egg-card__blurb">{COMPANIONS[id].blurb}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="picker__demo panel panel--soft">
        <p>
          <strong>Judges:</strong> skip the wait and see every stage at once.
        </p>
        <button type="button" className="btn" onClick={onLoadDemo} data-testid="load-demo">
          Load the demo den
        </button>
      </div>
    </section>
  );
}
