import {
  Route,
  Routes,
} from "react-router-dom";

import MainLayout from "./components/layout/MainLayout";

import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Goals from "./pages/Goals";
import MarketOpportunities from "./pages/MarketOpportunities";
import Portfolio from "./pages/Portfolio";
import Settings from "./pages/Settings";
import TradingLab from "./pages/TradingLab";

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route
          path="/"
          element={<Dashboard />}
        />

        <Route
          path="/portfolio"
          element={<Portfolio />}
        />

        <Route
          path="/opportunities"
          element={
            <MarketOpportunities />
          }
        />

        <Route
          path="/trading-lab"
          element={<TradingLab />}
        />

        <Route
          path="/analytics"
          element={<Analytics />}
        />

        <Route
          path="/goals"
          element={<Goals />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />
      </Routes>
    </MainLayout>
  );
}

export default App;