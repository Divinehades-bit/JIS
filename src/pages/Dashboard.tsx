import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsGrid from "../components/dashboard/StatsGrid";
import PortfolioChart from "../components/dashboard/PortfolioChart";
import AllocationChart from "../components/dashboard/AllocationChart";
import RecentActivity from "../components/dashboard/RecentActivity";
import TopHoldings from "../components/dashboard/TopHoldings";
import AddPositionForm from "../components/portfolio/AddPositionForm";

function Dashboard() {
  return (
    <>

      <DashboardHeader />

      <div className="mt-8">
        <StatsGrid />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">

        <div className="xl:col-span-2">
          <PortfolioChart />
        </div>

        <AllocationChart />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">

        <RecentActivity />

        <TopHoldings />

      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
            <AddPositionForm />
        </div>

    </>
  );
}

export default Dashboard;
