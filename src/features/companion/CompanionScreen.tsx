import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import type { CompanionId } from "@/contracts/index";
import { COMPANIONS } from "@/domain/companions/roster";
import { STAGE_NAMES, levelForXp } from "@/domain/companions/stages";
import { useProfile } from "@/app/ProfileProvider";
import Sprite from "@/ui/Sprite";
import XpBar from "@/ui/XpBar";
import Den from "./Den";
import EggPicker from "./EggPicker";
import HatchScene from "./HatchScene";
import "./CompanionScreen.css";

export default function CompanionScreen() {
  const profile = useProfile();
  const [hatching, setHatching] = useState<CompanionId | null>(null);
  const [busy, setBusy] = useState(false);
  const finishHatch = useCallback(() => setHatching(null), []);

  async function hatch(id: CompanionId) {
    if (busy) return;
    setBusy(true);
    setHatching(id);
    try {
      await profile.adopt(id);
    } catch (error) {
      setHatching(null);
      throw error;
    } finally {
      setBusy(false);
    }
  }

  const hasCompanion = Object.keys(profile.companions).length > 0;
  const active = profile.active;

  return (
    <div className="screen" data-testid="screen-companion">
      <h1>Companion</h1>

      {profile.error && (
        <p className="panel panel--warn" role="alert" data-testid="storage-error">
          Hangori could not open local storage: {profile.error}. Try a normal (not private) browser window.
        </p>
      )}

      {!profile.ready && !profile.error && <p className="lede">Waking the den...</p>}

      {profile.ready && hatching && (
        <HatchScene id={hatching} halloween={profile.halloween} onDone={finishHatch} />
      )}

      {profile.ready && !hatching && !hasCompanion && (
        <EggPicker halloween={profile.halloween} onPick={hatch} onLoadDemo={() => void profile.loadDemoDen()} />
      )}

      {profile.ready && !hatching && hasCompanion && active && (
        <section className="home" data-testid="companion-home">
          <div className="home__card panel">
            <div className="home__badges">
              <span className="chip" data-testid="companion-stage">
                Stage {active.stage} · {STAGE_NAMES[active.stage]}
              </span>
              {active.halloween && <span className="chip chip--orange">🎃 Halloween form</span>}
            </div>
            <Sprite id={active.id} stage={active.stage} halloween={active.halloween} size={176} />
            <h2 className="home__name" data-testid="companion-name">
              {COMPANIONS[active.id].name} the {COMPANIONS[active.id].species}
            </h2>
            <p className="home__level" data-testid="companion-level">
              Level {levelForXp(active.xp)}
            </p>
            <XpBar xp={active.xp} stage={active.stage} />
            <p className="home__meta">
              {active.totalMeals} {active.totalMeals === 1 ? "meal" : "meals"} eaten
            </p>
            <Link to="/feed" className="btn btn--primary" data-testid="go-feed">
              Feed {COMPANIONS[active.id].name}
            </Link>
          </div>
          <Den
            companions={profile.companions}
            activeId={profile.activeId}
            halloween={profile.halloween}
            onSelect={(id) => void profile.setActive(id)}
            onHatch={(id) => void hatch(id)}
          />
        </section>
      )}
    </div>
  );
}
