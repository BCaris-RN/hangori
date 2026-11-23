import { BrowserRouter, Routes, Route } from "react-router-dom";
import BottomNav from "./ui/BottomNav";
import CompanionScreen from "./features/companion/CompanionScreen";
import DealsScreen from "./features/deals/DealsScreen";
import FeedScreen from "./features/feed/FeedScreen";
import SavingsScreen from "./features/savings/SavingsScreen";
import SettingsScreen from "./features/settings/SettingsScreen";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <main className="app-content">
          <Routes>
            <Route path="/" element={<CompanionScreen />} />
            <Route path="/deals" element={<DealsScreen />} />
            <Route path="/feed" element={<FeedScreen />} />
            <Route path="/savings" element={<SavingsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
