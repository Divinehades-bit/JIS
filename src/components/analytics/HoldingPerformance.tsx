import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

type HoldingMetric = {
  symbol: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  investedCapital: number;
  marketValue: number;
  gainLoss: number;
  returnPercentage: number;
  allocation: number;
};

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sharesFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

const getPerformanceClassName = (value: number) => {
  if (value > 0) {
    return "text-emerald-600";
  }

  if (value < 0) {
    return "text-red-600";
  }

  return "text-slate-600";
};

const HoldingPerformance = () => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const {
    formatCurrency,
    formatSignedCurrency,
  } = useCurrencyFormatter();

  const analytics = useMemo(() => {
    const groupedPositions = positions.reduce<
      Record<
        string,
        {
          shares: number;
          investedCapital: number;
          marketValue: number;
        }
      >
    >((accumulator, position) => {
      const symbol = position.symbol
        .trim()
        .toUpperCase();

      if (!symbol) {
        return accumulator;
      }

      if (!accumulator[symbol]) {
        accumulator[symbol] = {
          shares: 0,
          investedCapital: 0,
          marketValue: 0,
        };
      }

      accumulator[symbol].shares += position.shares;

      accumulator[symbol].investedCapital +=
        position.shares * position.averageCost;

      accumulator[symbol].marketValue +=
        position.shares * position.price;

      return accumulator;
    }, {});

    const totalPortfolioValue = Object.values(
      groupedPositions,
    ).reduce(
      (total, holding) =>
        total + holding.marketValue,
      0,
    );

    const holdings = Object.entries(groupedPositions)
      .map<HoldingMetric>(
        ([
          symbol,
          {
            shares,
            investedCapital,
            marketValue,
          },
        ]) => {
          const averageCost =
            shares > 0
              ? investedCapital / shares
              : 0;

          const currentPrice =
            shares > 0 ? marketValue / shares : 0;

          const gainLoss =
            marketValue - investedCapital;

          const returnPercentage =
            investedCapital > 0
              ? (gainLoss / investedCapital) * 100
              : 0;

          const allocation =
            totalPortfolioValue > 0
              ? (marketValue /
                  totalPortfolioValue) *
                100
              : 0;

          return {
            symbol,
            shares,
            averageCost,
            currentPrice,
            investedCapital,
            marketValue,
            gainLoss,
            returnPercentage,
            allocation,
          };
        },
      )
      .sort(
        (firstHolding, secondHolding) =>
          secondHolding.returnPercentage -
          firstHolding.returnPercentage,
      );

    return {
      holdings,
      bestHolding: holdings[0] ?? null,
      worstHolding:
        holdings.length > 0
          ? holdings[holdings.length - 1]
          : null,
    };
  }, [positions]);

  if (analytics.holdings.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          No holding performance
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Add a position to compare investment returns.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">
            Holding performance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current performance ordered from highest to
            lowest return.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {analytics.bestHolding && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Best performer
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-800">
                {analytics.bestHolding.symbol}{" "}
                {analytics.bestHolding.returnPercentage >
                0
                  ? "+"
                  : ""}
                {percentageFormatter.format(
                  analytics.bestHolding
                    .returnPercentage,
                )}
                %
              </p>
            </div>
          )}

          {analytics.worstHolding && (
            <div className="rounded-xl bg-slate-100 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Lowest performer
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-800">
                {analytics.worstHolding.symbol}{" "}
                {analytics.worstHolding
                  .returnPercentage > 0
                  ? "+"
                  : ""}
                {percentageFormatter.format(
                  analytics.worstHolding
                    .returnPercentage,
                )}
                %
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1150px] divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Symbol
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Shares
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Average cost
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current price
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Market value
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Gain / loss
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Return
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Allocation
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {analytics.holdings.map((holding) => {
              const performanceClassName =
                getPerformanceClassName(
                  holding.gainLoss,
                );

              return (
                <tr
                  key={holding.symbol}
                  className="transition hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                        {holding.symbol
                          .slice(0, 3)
                          .toUpperCase()}
                      </div>

                      <span className="font-semibold text-slate-900">
                        {holding.symbol}
                      </span>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                    {sharesFormatter.format(
                      holding.shares,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                    {formatCurrency(
                      holding.averageCost,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                    {formatCurrency(
                      holding.currentPrice,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatCurrency(
                      holding.marketValue,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <span
                      className={`text-sm font-semibold ${performanceClassName}`}
                    >
                      {formatSignedCurrency(
                        holding.gainLoss,
                      )}
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <span
                      className={`text-sm font-semibold ${performanceClassName}`}
                    >
                      {holding.returnPercentage > 0
                        ? "+"
                        : ""}
                      {percentageFormatter.format(
                        holding.returnPercentage,
                      )}
                      %
                    </span>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right">
                    <div className="ml-auto flex w-28 flex-col gap-1">
                      <span className="text-sm font-medium text-slate-700">
                        {percentageFormatter.format(
                          holding.allocation,
                        )}
                        %
                      </span>

                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-700"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                holding.allocation,
                                0,
                              ),
                              100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default HoldingPerformance;