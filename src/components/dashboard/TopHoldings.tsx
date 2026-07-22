import usePortfolioStore from "../../store/portfolioStore";

function TopHoldings() {
  const positions = usePortfolioStore((state) => state.positions);
const removePosition = usePortfolioStore((state) => state.removePosition);
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
      <h2 className="text-2xl font-bold">
        Top Holdings
      </h2>

      <p className="text-slate-500 mt-1 mb-6">
        Largest portfolio positions
      </p>

      <div className="space-y-4">
        {positions.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center border-b border-slate-100 pb-3"
          >
            <div>
              <p className="font-semibold">
                {item.symbol}
              </p>

              <p className="text-slate-500 text-sm">
                {item.shares} shares
              </p>
            </div>
            <div className="text-right">

  <p className="font-semibold">
    ${item.price}
  </p>

  <p className="text-slate-500 text-sm">
    ${(item.shares * item.price).toLocaleString()}
  </p>

  <button
    onClick={() => removePosition(item.id)}
    className="mt-2 text-red-500 hover:text-red-700 text-sm font-semibold"
  >
    Delete
  </button>

</div>

    
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopHoldings;