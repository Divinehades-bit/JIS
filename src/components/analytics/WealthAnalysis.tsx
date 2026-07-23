import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useWealthSummary from "../../hooks/useWealthSummary";

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const WealthAnalysis = () => {
  const { formatCurrency } =
    useCurrencyFormatter();

  const summary = useWealthSummary();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Wealth composition
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          How your total net worth is divided
          between investments and cash.
        </p>
      </div>

      <div className="mt-6">
        <div className="overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-5">
            <div
              className="bg-blue-600 transition-all"
              style={{
                width: `${summary.investmentAllocation}%`,
              }}
              title="Investments"
            />

            <div
              className="bg-emerald-500 transition-all"
              style={{
                width: `${summary.cashAllocation}%`,
              }}
              title="Cash"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-blue-600" />

              <p className="text-sm font-semibold text-slate-900">
                Investments
              </p>
            </div>

            <p className="mt-3 text-xl font-bold text-slate-900">
              {summary.investmentCurrentValue ===
              null
                ? "FX pending"
                : formatCurrency(
                    summary.investmentCurrentValue,
                  )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {percentageFormatter.format(
                summary.investmentAllocation,
              )}
              % of net worth
            </p>
          </article>

          <article className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />

              <p className="text-sm font-semibold text-slate-900">
                Cash
              </p>
            </div>

            <p className="mt-3 text-xl font-bold text-slate-900">
              {formatCurrency(
                summary.totalCash,
              )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {percentageFormatter.format(
                summary.cashAllocation,
              )}
              % of net worth
            </p>
          </article>
        </div>

        {summary.currencyBreakdown.length >
          0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Cash by currency
            </p>

            <div className="mt-3 space-y-3">
              {summary.currencyBreakdown.map(
                (item) => (
                  <div
                    key={item.currency}
                    className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.currency}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        {percentageFormatter.format(
                          item.percentage,
                        )}
                        % of cash
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(
                        item.value,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        )}

        {!summary.hasCompleteFx && (
          <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
            Some values are waiting for
            updated exchange rates.
          </div>
        )}
      </div>
    </section>
  );
};

export default WealthAnalysis;