import  usePortfolioStore  from "../../store/portfolioStore";

export default function PortfolioSummary() {
  const positions = usePortfolioStore((state) => state.positions);

  const portfolioValue = positions.reduce(
    (total, position) => total + position.shares * position.price,
    0
  );

  const holdings = positions.length;

  const averagePosition =
    holdings > 0 ? portfolioValue / holdings : 0;

  const largestHolding =
    positions.length > 0
      ? positions.reduce((largest, current) =>
          current.shares * current.price >
          largest.shares * largest.price
            ? current
            : largest
        )
      : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500">Portfolio Value</p>

        <h2 className="text-3xl font-bold mt-3">
          ${portfolioValue.toLocaleString()}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500">Holdings</p>

        <h2 className="text-3xl font-bold mt-3">
          {holdings}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500">Average Position</p>

        <h2 className="text-3xl font-bold mt-3">
          ${averagePosition.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
        </h2>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <p className="text-slate-500">Largest Holding</p>

        <h2 className="text-3xl font-bold mt-3">
          {largestHolding?.symbol ?? "-"}
        </h2>

        <p className="text-slate-500 mt-2">
          {largestHolding
            ? `$${(
                largestHolding.shares * largestHolding.price
              ).toLocaleString()}`
            : "No positions"}
        </p>
      </div>

    </div>
  );
}