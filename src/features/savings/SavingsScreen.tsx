import { useProfile } from "@/app/ProfileProvider";
import { dollars } from "@/app/deals";
import "./SavingsScreen.css";

export default function SavingsScreen() {
  const { ready, meals, totalSavedCents, dealMeals } = useProfile();
  const dealList = meals.filter((m) => m.savedCents !== null).slice(0, 8);

  return (
    <div className="screen" data-testid="screen-savings">
      <h1>Savings</h1>
      <p className="lede">What deals saved you on meals that counted. Savings never change XP.</p>

      <section className="savings-total panel" aria-label="Total saved">
        <p className="savings-total__label">Total saved</p>
        <p className="savings-total__amount" data-testid="savings-total">
          {dollars(totalSavedCents)}
        </p>
        <p className="savings-total__meta" data-testid="savings-count">
          {dealMeals} {dealMeals === 1 ? "meal" : "meals"} with a deal · {meals.length} counted in all
        </p>
      </section>

      <section aria-labelledby="recent-title">
        <h2 id="recent-title" className="section-title">
          Recent deal meals
        </h2>
        {ready && dealList.length === 0 && (
          <p className="panel panel--soft" data-testid="savings-empty">
            Nothing yet. Feed your companion a meal that used a deal and it shows up here.
          </p>
        )}
        <ul className="savings-list">
          {dealList.map((meal) => (
            <li key={meal.id} className="savings-row panel">
              <span className="savings-row__shop">{meal.merchantName}</span>
              <span className="savings-row__paid">paid {dollars(meal.totalCents)}</span>
              <span className="savings-row__saved">saved {dollars(meal.savedCents ?? 0)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
