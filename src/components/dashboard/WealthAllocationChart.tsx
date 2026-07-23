import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useWealthSummary from "../../hooks/useWealthSummary";

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const WealthAllocationChart = () => {
  const { formatCurrency } =
    useCurrencyFormatter();

  const summary = useWealthSummary();

  const netWorth =
    summary.netWorth ?? 0;

  const investments =
    summary.investmentCurrentValue ?? 0;

  const investmentPercentage =
    netWorth > 0
      ? (investments / netWorth) * 100
      : 0;

  const cashPercentage =
    netWorth > 0
      ? (summary.totalCash / netWorth) *
        100
      : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Wealth allocation
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Distribution between investments
          and available cash.
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Total net worth
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {summary.netWorth === null
                ? "FX pending"
                : formatCurrency(
                    summary.netWorth,
                  )}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-slate-400">
              Cash allocation
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-900">
              {percentageFormatter.format(
                cashPercentage,
              )}
              %
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-4 w-full">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${investmentPercentage}%`,
              }}
              title={`Investments ${percentageFormatter.format(
                investmentPercentage,
              )}%`}
            />

            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${cashPercentage}%`,
              }}
              title={`Cash ${percentageFormatter.format(
                cashPercentage,
              )}%`}
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full bg-blue-600" />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Investments
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  Stocks and ETFs
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {summary.investmentCurrentValue ===
                null
                  ? "FX pending"
                  : formatCurrency(
                      summary.investmentCurrentValue,
                    )}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {percentageFormatter.format(
                  investmentPercentage,
                )}
                %
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500" />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Cash
                </p>

                <p className="mt-0.5 text-xs text-slate-400">
                  All cash accounts converted
                  to {summary.baseCurrency}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(
                  summary.totalCash,
                )}
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {percentageFormatter.format(
                  cashPercentage,
                )}
                %
              </p>
            </div>
          </div>
        </div>

        {!summary.hasCompleteFx && (
          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
            Some values are waiting for
            exchange-rate information. Open
            Portfolio → Cash accounts and
            refresh FX rates.
          </div>
        )}
      </div>
    </section>
  );
};

export default WealthAllocationChart;