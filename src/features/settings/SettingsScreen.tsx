import { useState } from "react";
import { defaultMealRules } from "@/contracts/index";
import { useProfile } from "@/app/ProfileProvider";
import "./SettingsScreen.css";

export default function SettingsScreen() {
  const profile = useProfile();
  const [confirmReset, setConfirmReset] = useState(false);
  const rules = defaultMealRules;

  return (
    <div className="screen" data-testid="screen-settings">
      <h1>Settings</h1>

      <section className="panel" aria-labelledby="profile-title">
        <h2 id="profile-title" className="section-title">
          Profile
        </h2>
        <p data-testid="profile-kind">
          {profile.demo ? "Demo den: made-up companions and meals." : "Local profile on this device."}
        </p>
        <p className="fineprint">No account and no login. Everything stays on this device.</p>
        <div className="actions">
          <button type="button" className="btn" onClick={() => void profile.loadDemoDen()} data-testid="settings-load-demo">
            Load the demo den
          </button>
          {!confirmReset ? (
            <button type="button" className="btn btn--danger" onClick={() => setConfirmReset(true)} data-testid="settings-reset">
              Reset everything
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                setConfirmReset(false);
                void profile.reset();
              }}
              data-testid="settings-reset-confirm"
            >
              Tap again to erase all local data
            </button>
          )}
        </div>
      </section>

      <section className="panel" aria-labelledby="look-title">
        <h2 id="look-title" className="section-title">
          Look
        </h2>
        <label className="switch">
          <input
            type="checkbox"
            checked={profile.halloween}
            onChange={(e) => void profile.setHalloween(e.target.checked)}
            data-testid="halloween-toggle"
          />
          <span>Halloween forms 🎃</span>
        </label>
        <p className="fineprint">Glowing eyes, bat wings and a floating jack-o'-lantern.</p>
      </section>

      <section className="panel" aria-labelledby="rules-title">
        <h2 id="rules-title" className="section-title">
          Meal rules in play
        </h2>
        <dl className="rules">
          <dt>XP per meal</dt>
          <dd>{rules.xpPerMeal}, whatever the price</dd>
          <dt>Meals per 24 hours</dt>
          <dd>{rules.maxMealsPer24h} at most</dd>
          <dt>Time between meals</dt>
          <dd>{rules.minHoursBetweenMeals} hours at least</dd>
          <dt>Receipt age</dt>
          <dd>{rules.maxReceiptAgeHours} hours at most</dd>
          <dt>Deal-only mode</dt>
          <dd>{rules.countOnlyDealMeals ? "On" : "Off"}</dd>
        </dl>
        <p className="fineprint">Full rules live in the repo, in .kiro/steering/hangori-rules.md.</p>
      </section>
    </div>
  );
}
