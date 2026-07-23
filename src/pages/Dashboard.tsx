import { Link } from "react-router-dom";
import PortfolioChart from "../components/dashboard/PortfolioChart";
import PortfolioHistoryChart from "../components/dashboard/PortfolioHistoryChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import StatsGrid from "../components/dashboard/StatsGrid";
import TopHoldings from "../components/dashboard/TopHoldings";
import PriceSyncControl from "../components/market/PriceSyncControl";
import usePortfolioStore from "../store/portfolioStore";
import useSettingsStore from "../store/settingsStore";

const Dashboard = () => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const portfolioName = useSettingsStore(
    (state) =>
      state.settings.portfolioName,
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Investment dashboard
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {portfolioName}
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Review portfolio value,
            performance, allocation and recent
            transactions.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <PriceSyncControl />

          <Link
            to="/portfolio"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Manage portfolio

            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m9 18 6-6-6-6"
              />
            </svg>
          </Link>
        </div>
      </section>

      <StatsGrid />

      <PortfolioHistoryChart />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
        <PortfolioChart />

        <TopHoldings />
      </section>

      <RecentActivity />

      {positions.length === 0 && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Start building your portfolio
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Record your first purchase amount
            to activate the dashboard
            calculations and allocation chart.
          </p>

          <Link
            to="/portfolio"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to portfolio
          </Link>
        </section>
      )}
    </div>
  );
};

export default Dashboard;