import { useMemo } from "react";
import { Link } from "react-router-dom";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

type Holding = {
  symbol: string;
  marketValue: number;
  investedCapital: number;
  gainLoss: number;
  returnPercentage: number;
  allocation: number;
};

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const TopHoldings = () => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const { formatCurrency } = useCurrencyFormatter();

  const holdings = useMemo(() => {
    const groupedHoldings = positions.reduce<
      Record<
        string,
        {
          marketValue: number;
          investedCapital: number;
        }
      >
    >((accumulator, position) => {
      const symbol = position.symbol.trim().toUpperCase();

      if (!symbol) {
        return accumulator;
      }

      const marketValue =
        position.shares * position.price;

      const investedCapital =
        position.shares * position.averageCost;

      if (!accumulator[symbol]) {
        accumulator[symbol] = {
          marketValue: 0,
          investedCapital: 0,
        };
      }

      accumulator[symbol].marketValue += marketValue;
      accumulator[symbol].investedCapital +=
        investedCapital;

      return accumulator;
    }, {});

    const totalPortfolioValue = Object.values(
      groupedHoldings,
    ).reduce(
      (total, holding) =>
        total + holding.marketValue,
      0,
    );

    return Object.entries(groupedHoldings)
      .map<Holding>(
        ([
          symbol,
          { marketValue, investedCapital },
        ]) => {
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
            marketValue,
            investedCapital,
            gainLoss,
            returnPercentage,
            allocation,
          };
        },
      )
      .sort(
        (firstHolding, secondHolding) =>
          secondHolding.marketValue -
          firstHolding.marketValue,
      )
      .slice(0, 5);
  }, [positions]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Top holdings
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Largest assets by current market value.
          </p>
        </div>

        <Link
          to="/portfolio"
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          View all
        </Link>
      </div>

      {holdings.length === 0 ? (
        <div className="flex min-h-72 items-center justify-center p-8 text-center">
          <div>
            <h3 className="font-semibold text-slate-900">
              No holdings yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add a position to see your largest assets.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {holdings.map((holding, index) => {
            const isPositive = holding.gainLoss > 0;
            const isNegative = holding.gainLoss < 0;

            const performanceClassName = isPositive
              ? "text-emerald-600"
              : isNegative
                ? "text-red-600"
                : "text-slate-500";

            const performancePrefix = isPositive
              ? "+"
              : "";

            return (
              <article
                key={holding.symbol}
                className="px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                    {holding.symbol
                      .slice(0, 3)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-slate-900">
                            {holding.symbol}
                          </p>

                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                            #{index + 1}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {percentageFormatter.format(
                            holding.allocation,
                          )}
                          % of portfolio
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(
                            holding.marketValue,
                          )}
                        </p>

                        <p
                          className={`mt-1 text-xs font-medium ${performanceClassName}`}
                        >
                          {performancePrefix}
                          {percentageFormatter.format(
                            holding.returnPercentage,
                          )}
                          %
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default TopHoldings;