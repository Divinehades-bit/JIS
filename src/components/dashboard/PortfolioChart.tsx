import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

type AllocationItem = {
  symbol: string;
  marketValue: number;
  percentage: number;
  color: string;
  offset: number;
};

const chartColors = [
  "#0f172a",
  "#2563eb",
  "#0d9488",
  "#7c3aed",
  "#ea580c",
  "#db2777",
  "#65a30d",
  "#0891b2",
  "#9333ea",
  "#ca8a04",
];

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const PortfolioChart = () => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const {
    formatCurrency,
    formatCompactCurrency,
  } = useCurrencyFormatter();

  const { allocations, totalValue } = useMemo(() => {
    const groupedPositions = positions.reduce<
      Record<string, number>
    >((accumulator, position) => {
      const symbol = position.symbol.trim().toUpperCase();
      const marketValue =
        position.shares * position.price;

      if (
        !symbol ||
        !Number.isFinite(marketValue) ||
        marketValue <= 0
      ) {
        return accumulator;
      }

      accumulator[symbol] =
        (accumulator[symbol] ?? 0) + marketValue;

      return accumulator;
    }, {});

    const entries = Object.entries(groupedPositions).sort(
      ([, firstValue], [, secondValue]) =>
        secondValue - firstValue,
    );

    const nextTotalValue = entries.reduce(
      (total, [, marketValue]) =>
        total + marketValue,
      0,
    );

    let cumulativeOffset = 0;

    const nextAllocations: AllocationItem[] = entries.map(
      ([symbol, marketValue], index) => {
        const percentage =
          nextTotalValue > 0
            ? (marketValue / nextTotalValue) * 100
            : 0;

        const allocation: AllocationItem = {
          symbol,
          marketValue,
          percentage,
          color:
            chartColors[index % chartColors.length],
          offset: cumulativeOffset,
        };

        cumulativeOffset += percentage;

        return allocation;
      },
    );

    return {
      allocations: nextAllocations,
      totalValue: nextTotalValue,
    };
  }, [positions]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Portfolio allocation
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Current distribution by market value.
        </p>
      </div>

      {allocations.length === 0 ? (
        <div className="mt-6 flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-500">
              %
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No allocation data
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add a position to generate the chart.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-center">
          <div className="flex justify-center">
            <div className="relative h-56 w-56">
              <svg
                viewBox="0 0 120 120"
                className="h-full w-full -rotate-90"
                role="img"
                aria-label="Portfolio allocation chart"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="42"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="17"
                />

                {allocations.map((allocation) => (
                  <circle
                    key={allocation.symbol}
                    cx="60"
                    cy="60"
                    r="42"
                    fill="none"
                    pathLength="100"
                    stroke={allocation.color}
                    strokeWidth="17"
                    strokeDasharray={`${allocation.percentage} ${
                      100 - allocation.percentage
                    }`}
                    strokeDashoffset={
                      -allocation.offset
                    }
                  >
                    <title>
                      {allocation.symbol}:{" "}
                      {percentageFormatter.format(
                        allocation.percentage,
                      )}
                      %
                    </title>
                  </circle>
                ))}
              </svg>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Total
                </span>

                <span className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {formatCompactCurrency(totalValue)}
                </span>

                <span className="mt-1 text-xs text-slate-400">
                  {allocations.length}{" "}
                  {allocations.length === 1
                    ? "asset"
                    : "assets"}
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {allocations.map((allocation) => (
              <div
                key={allocation.symbol}
                className="rounded-xl border border-slate-100 p-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{
                        backgroundColor: allocation.color,
                      }}
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {allocation.symbol}
                      </p>

                      <p className="text-xs text-slate-500">
                        {formatCurrency(
                          allocation.marketValue,
                        )}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-sm font-semibold text-slate-700">
                    {percentageFormatter.format(
                      allocation.percentage,
                    )}
                    %
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        Math.max(
                          allocation.percentage,
                          0,
                        ),
                        100,
                      )}%`,
                      backgroundColor: allocation.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default PortfolioChart;