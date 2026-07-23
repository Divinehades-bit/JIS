import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import type { Position } from "../../store/portfolioStore";

type PortfolioRowProps = {
  position: Position;
  allocation: number;
  onEdit: (position: Position) => void;
  onDelete: (position: Position) => void;
};

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PortfolioRow = ({
  position,
  allocation,
  onEdit,
  onDelete,
}: PortfolioRowProps) => {
  const { formatCurrency, formatSignedCurrency } =
    useCurrencyFormatter();

  const investedCapital =
    position.shares * position.averageCost;

  const marketValue =
    position.shares * position.price;

  const gainLoss = marketValue - investedCapital;

  const returnPercentage =
    investedCapital > 0
      ? (gainLoss / investedCapital) * 100
      : 0;

  const isPositive = gainLoss > 0;
  const isNegative = gainLoss < 0;

  const performanceClassName = isPositive
    ? "text-emerald-600"
    : isNegative
      ? "text-red-600"
      : "text-slate-600";

  const returnPrefix =
    returnPercentage > 0 ? "+" : "";

  return (
    <tr className="transition hover:bg-slate-50">
      <td className="whitespace-nowrap px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
            {position.symbol.slice(0, 3).toUpperCase()}
          </div>

          <div>
            <p className="font-semibold text-slate-900">
              {position.symbol.toUpperCase()}
            </p>

            <p className="text-xs text-slate-500">
              Investment position
            </p>
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
        {position.shares.toLocaleString("en-US", {
          maximumFractionDigits: 4,
        })}
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
        {formatCurrency(position.averageCost)}
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
        {formatCurrency(position.price)}
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
        {formatCurrency(investedCapital)}
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
        {formatCurrency(marketValue)}
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right">
        <span
          className={`text-sm font-semibold ${performanceClassName}`}
        >
          {formatSignedCurrency(gainLoss)}
        </span>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right">
        <span
          className={`text-sm font-semibold ${performanceClassName}`}
        >
          {returnPrefix}
          {percentageFormatter.format(returnPercentage)}%
        </span>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right">
        <div className="ml-auto flex w-28 flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            {percentageFormatter.format(allocation)}%
          </span>

          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-700"
              style={{
                width: `${Math.min(
                  Math.max(allocation, 0),
                  100,
                )}%`,
              }}
            />
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(position)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(position)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
};

export default PortfolioRow;