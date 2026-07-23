import AnalyticsSummary from "../components/analytics/AnalyticsSummary";
import HoldingPerformance from "../components/analytics/HoldingPerformance";
import MonthlyCashFlowChart from "../components/analytics/MonthlyCashFlowChart";

const Analytics = () => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Investment analytics
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Portfolio performance
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Analyze cash invested, completed sales,
          realized profits and the performance of each
          holding.
        </p>
      </section>

      <AnalyticsSummary />

      <MonthlyCashFlowChart />

      <HoldingPerformance />
    </div>
  );
};

export default Analytics;