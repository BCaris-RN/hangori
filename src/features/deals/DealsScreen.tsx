import { useProfile } from "@/app/ProfileProvider";
import { LINK_OUT_LABEL, dollars } from "@/app/deals";
import "./DealsScreen.css";

export default function DealsScreen() {
  const { deals } = useProfile();

  return (
    <div className="screen" data-testid="screen-deals">
      <h1>Deals</h1>
      <p className="lede">Coupons from made-up local restaurants. Pay with a deal, log the receipt, save money.</p>

      {!deals && <p className="lede">Loading deals...</p>}

      {deals && (
        <ul className="restaurants">
          {deals.restaurants.map((restaurant) => {
            const list = deals.deals.filter((d) => d.restaurantId === restaurant.id);
            return (
              <li key={restaurant.id} className="restaurant panel" data-testid={`restaurant-${restaurant.id}`}>
                <header className="restaurant__head">
                  <h2 className="restaurant__name">{restaurant.name}</h2>
                  <p className="restaurant__meta">
                    {restaurant.category} · {restaurant.address}
                  </p>
                </header>
                <ul className="deals">
                  {list.map((deal) => (
                    <li key={deal.id} className="deal" data-testid={`deal-${deal.id}`}>
                      <h3 className="deal__title">{deal.title}</h3>
                      <p className="deal__desc">{deal.description}</p>
                      <p className="deal__chips">
                        {deal.code && <span className="chip chip--code">Code {deal.code}</span>}
                        {deal.estimatedSavingsCents !== null && (
                          <span className="chip chip--green">Save about {dollars(deal.estimatedSavingsCents)}</span>
                        )}
                      </p>
                      <p className="deal__terms">{deal.terms}</p>
                      <a className="btn btn--small" href={deal.linkOutUrl} target="_blank" rel="noopener noreferrer">
                        {LINK_OUT_LABEL}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <p className="fineprint">
        Demo data only. Link-outs open a placeholder page, and Hangori never asks for a food-app login.
      </p>
    </div>
  );
}
