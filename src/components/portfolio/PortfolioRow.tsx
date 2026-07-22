import type { Position } from "../../store/portfolioStore";
import usePortfolioStore from "../../store/portfolioStore";
import { Pencil, Trash2 } from "lucide-react";

type Props = {
  position: Position;
  totalPortfolio: number;
};

export default function PortfolioRow({
  position,
  totalPortfolio,
}: Props) {
  const removePosition = usePortfolioStore(
    (state) => state.removePosition
  );

  const value = position.shares * position.price;

  const weight =
    totalPortfolio > 0
      ? (value / totalPortfolio) * 100
      : 0;

  return (
    <tr className="border-t hover:bg-slate-50 transition">

      <td className="p-4 font-semibold">
        {position.symbol}
      </td>

      <td className="p-4 text-right">
        {position.shares}
      </td>

      <td className="p-4 text-right">
        ${position.price.toLocaleString()}
      </td>

      <td className="p-4 text-right font-semibold">
        ${value.toLocaleString()}
      </td>

      <td className="p-4">

        <div className="flex items-center gap-3">

          <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden">

            <div
              className="h-full bg-blue-600"
              style={{ width: `${weight}%` }}
            />

          </div>

          <span className="text-sm">
            {weight.toFixed(1)}%
          </span>

        </div>

      </td>

      <td className="p-4">

        <div className="flex justify-center gap-3">

          <button className="text-slate-500 hover:text-blue-600">
            <Pencil size={18} />
          </button>

          <button
            onClick={() => removePosition(position.id)}
            className="text-slate-500 hover:text-red-600"
          >
            <Trash2 size={18} />
          </button>

        </div>

      </td>

    </tr>
  );
}