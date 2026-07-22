import usePortfolioStore from "../../store/portfolioStore";

export default function PortfolioTable() {
  const positions = usePortfolioStore((state) => state.positions);
  const removePosition = usePortfolioStore((state) => state.removePosition);

  const totalPortfolio = positions.reduce(
    (sum, position) => sum + position.shares * position.price,
    0
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

      <table className="w-full">

        <thead className="bg-slate-100">

          <tr className="text-left">

            <th className="p-4">Symbol</th>

            <th className="p-4">Shares</th>

            <th className="p-4">Price</th>

            <th className="p-4">Value</th>

            <th className="p-4">Weight</th>

            <th className="p-4 text-center">Actions</th>

          </tr>

        </thead>

        <tbody>

          {positions.map((position) => {

            const value = position.shares * position.price;

            const weight =
              totalPortfolio > 0
                ? (value / totalPortfolio) * 100
                : 0;

            return (

              <tr
                key={position.id}
                className="border-t hover:bg-slate-50 transition"
              >

                <td className="p-4 font-semibold">
                  {position.symbol}
                </td>

                <td className="p-4">
                  {position.shares}
                </td>

                <td className="p-4">
                  ${position.price.toLocaleString()}
                </td>

                <td className="p-4 font-semibold">
                  ${value.toLocaleString()}
                </td>

                <td className="p-4">
                  {weight.toFixed(1)}%
                </td>

                <td className="p-4 text-center">

                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => removePosition(position.id)}
                  >
                    Delete
                  </button>

                </td>

              </tr>

            );
          })}

        </tbody>

      </table>

    </div>
  );
}