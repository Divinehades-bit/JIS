import StatCard from "./StatCard";

function StatsGrid() {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">

      <StatCard
        title="Portfolio Value"
        value="$14,732"
        subtitle="+1.42% today"
      />

      <StatCard
        title="Today's P/L"
        value="+$207"
        subtitle="+1.42%"
      />

      <StatCard
        title="Cash"
        value="$105"
      />

      <StatCard
        title="Holdings"
        value="12"
      />

    </div>
  );
}

export default StatsGrid;