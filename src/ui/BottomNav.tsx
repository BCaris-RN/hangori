import { NavLink } from "react-router-dom";
import "./BottomNav.css";

const NAV_ITEMS = [
  { to: "/", label: "Companion", icon: "🎃" },
  { to: "/deals", label: "Deals", icon: "🏷️" },
  { to: "/feed", label: "Feed", icon: "🧾" },
  { to: "/savings", label: "Savings", icon: "💰" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
] as const;

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          data-testid={`nav-${label.toLowerCase()}`}
          className={({ isActive }) =>
            ["bottom-nav__item", isActive ? "bottom-nav__item--active" : ""].join(" ").trim()
          }
        >
          <span className="bottom-nav__icon" aria-hidden="true">
            {icon}
          </span>
          <span className="bottom-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
