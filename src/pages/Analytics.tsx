import AnalyticsSummary from "../components/analytics/AnalyticsSummary";
import CashPerformance from "../components/analytics/CashPerformance";
import HoldingPerformance from "../components/analytics/HoldingPerformance";
import MonthlyCashFlowChart from "../components/analytics/MonthlyCashFlowChart";
import RealizedGains from "../components/analytics/RealizedGains";
import WealthAnalysis from "../components/analytics/WealthAnalysis";

const Analytics = () => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Wealth analytics
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Financial performance
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Analyze your complete JIS wealth:
          investments, cash, realized and unrealized
          performance, annual income and asset
          allocation.
        </p>
      </section>

      <AnalyticsSummary />

      <section className="grid gap-6 xl:grid-cols-2">
        <WealthAnalysis />

        <MonthlyCashFlowChart />
      </section>

      <RealizedGains />

      <CashPerformance />

      <HoldingPerformance />
    </div>
  );
};

export default Analytics;