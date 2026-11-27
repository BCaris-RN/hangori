import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COMPANIONS } from "@/domain/companions/roster";
import { levelForXp } from "@/domain/companions/stages";
import { formatWait } from "@/domain/meals/time";
import { SAMPLE_RECEIPTS, type SampleReceipt } from "@/app/demo/samples";
import { useProfile, type FeedOutcome } from "@/app/ProfileProvider";
import EvolutionOverlay from "@/ui/EvolutionOverlay";
import Sprite from "@/ui/Sprite";
import XpBar from "@/ui/XpBar";
import "./FeedScreen.css";

interface Shown {
  outcome: FeedOutcome;
  at: number;
}

/** Plain-words headline and body for a decision. */
function describe(shown: Shown, name: string): { title: string; body: string } {
  const { decision } = shown.outcome;
  switch (decision.reasonCode) {
    case "counted":
      return {
        title: "Meal counted!",
        body: `${name} ate and gained ${decision.xpAwarded} XP.`,
      };
    case "too_soon":
    case "daily_limit": {
      const wait = formatWait((decision.nextEligibleAtMs ?? shown.at) - shown.at);
      return { title: `${name} is full.`, body: `Next meal in ${wait}.` };
    }
    default:
      return {
        title: decision.outcome === "needs_review" ? "Needs a quick look" : "Not counted",
        body: decision.reason,
      };
  }
}

function SampleButton({ sample, busy, onTap }: { sample: SampleReceipt; busy: boolean; onTap: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        className="sample panel"
        disabled={busy}
        onClick={() => onTap(sample.id)}
        data-testid={`sample-${sample.id}`}
      >
        <span className="sample__emoji" aria-hidden="true">
          {sample.emoji}
        </span>
        <span className="sample__text">
          <span className="sample__title">{sample.title}</span>
          <span className="sample__detail">{sample.detail}</span>
          <span className="sample__expect">{sample.expect}</span>
        </span>
      </button>
    </li>
  );
}

export default function FeedScreen() {
  const profile = useProfile();
  const [shown, setShown] = useState<Shown | null>(null);
  const [evolution, setEvolution] = useState<FeedOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = profile.active;
  const name = active ? COMPANIONS[active.id].name : "Your companion";

  // The sample buttons sit below the result. Bring the result and the XP bar back
  // into view, or on a phone the verdict would be off-screen.
  useEffect(() => {
    if (shown) window.scrollTo({ top: 0, behavior: "auto" });
  }, [shown]);

  async function tap(sampleId: string) {
    setBusy(true);
    setError(null);
    try {
      const outcome = await profile.feed(sampleId);
      setShown({ outcome, at: Date.now() });
      if (outcome.evolved) setEvolution(outcome);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const described = shown ? describe(shown, name) : null;
  const counted = shown?.outcome.decision.outcome === "counted";

  return (
    <div className="screen" data-testid="screen-feed">
      <h1>Feed</h1>

      {!profile.ready && <p className="lede">Loading...</p>}

      {profile.ready && !active && (
        <div className="panel" data-testid="feed-needs-companion">
          <p>Pick a companion first. Only a companion can eat a meal.</p>
          <Link to="/" className="btn btn--primary">
            Pick a companion
          </Link>
        </div>
      )}

      {profile.ready && active && (
        <>
          <section className="feed-head panel" aria-label="Your companion">
            <Sprite
              id={active.id}
              stage={active.stage}
              halloween={active.halloween}
              size={72}
              motion={counted ? "eat" : "idle"}
            />
            <div className="feed-head__info">
              <p className="feed-head__name" data-testid="feed-companion-name">
                {name} · Level {levelForXp(active.xp)}
              </p>
              <XpBar xp={active.xp} stage={active.stage} />
            </div>
          </section>

          {error && (
            <p className="panel panel--warn" role="alert">
              {error}
            </p>
          )}

          {shown && described && (
            <section
              className={`result panel result--${shown.outcome.decision.outcome}`}
              data-testid="feed-result"
              data-code={shown.outcome.decision.reasonCode}
              data-outcome={shown.outcome.decision.outcome}
              aria-live="polite"
            >
              <h2 className="result__title">{described.title}</h2>
              <p className="result__body">{described.body}</p>
              {counted && (
                <p className="result__xp" data-testid="feed-xp">
                  +{shown.outcome.decision.xpAwarded} XP
                  {shown.outcome.leveledUp && (
                    <span className="chip chip--orange" data-testid="feed-levelup">
                      Level up! {shown.outcome.fromLevel} → {shown.outcome.toLevel}
                    </span>
                  )}
                </p>
              )}
              {!counted && (
                <p className="result__code">Rule: {shown.outcome.decision.reasonCode.replace(/_/g, " ")} · 0 XP</p>
              )}
            </section>
          )}

          <section aria-labelledby="meals-title">
            <h2 id="meals-title" className="section-title">
              Feed {name}
            </h2>
            <p className="lede">
              Tap a sample receipt. These are made-up receipts that go through the same rules as a real one.
            </p>
            <ul className="samples">
              {SAMPLE_RECEIPTS.filter((s) => s.group === "meal").map((s) => (
                <SampleButton key={s.id} sample={s} busy={busy} onTap={tap} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="gaming-title">
            <h2 id="gaming-title" className="section-title">
              Try to game it
            </h2>
            <ul className="samples">
              {SAMPLE_RECEIPTS.filter((s) => s.group === "gaming").map((s) => (
                <SampleButton key={s.id} sample={s} busy={busy} onTap={tap} />
              ))}
            </ul>
          </section>

          <p className="fineprint">
            Camera scanning is not wired in this build. The reading spike passed (17 of 20 receipts, on the device), so
            it is next.
          </p>
        </>
      )}

      {evolution && active && (
        <EvolutionOverlay
          id={evolution.companion.id}
          fromStage={evolution.fromStage}
          toStage={evolution.toStage}
          halloween={evolution.companion.halloween}
          onClose={() => setEvolution(null)}
        />
      )}
    </div>
  );
}
