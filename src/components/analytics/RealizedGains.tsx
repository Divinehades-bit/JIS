import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const RealizedGains = () => {
  const transactions = usePortfolioStore(
    (state) => state.transactions,
  );

  const { formatCurrencyFor } =
    useCurrencyFormatter();

  const analytics = useMemo(() => {
    const sales = transactions
      .filter(
        (transaction) =>
          transaction.type === "sell" &&
          transaction.realizedGainLoss !== undefined,
      )
      .sort(
        (first, second) =>
          new Date(second.date).getTime() -
          new Date(first.date).getTime(),
      );

    const totalProceeds = sales.reduce(
      (total, transaction) =>
        total + transaction.amount,
      0,
    );

    const totalRealizedGainLoss = sales.reduce(
      (total, transaction) =>
        total +
        (transaction.realizedGainLoss ?? 0),
      0,
    );

    const totalCostBasis = sales.reduce(
      (total, transaction) => {
        const realizedGainLoss =
          transaction.realizedGainLoss ?? 0;

        return (
          total +
          (transaction.amount - realizedGainLoss)
        );
      },
      0,
    );

    const realizedReturn =
      totalCostBasis > 0
        ? (totalRealizedGainLoss /
            totalCostBasis) *
          100
        : 0;

    const profitableSales = sales.filter(
      (transaction) =>
        (transaction.realizedGainLoss ?? 0) >
        0,
    ).length;

    const losingSales = sales.filter(
      (transaction) =>
        (transaction.realizedGainLoss ?? 0) <
        0,
    ).length;

    const winRate =
      sales.length > 0
        ? (profitableSales /
            sales.length) *
          100
        : 0;

    return {
      sales,
      totalProceeds,
      totalCostBasis,
      totalRealizedGainLoss,
      realizedReturn,
      profitableSales,
      losingSales,
      winRate,
    };
  }, [transactions]);

  const gainLossClassName =
    analytics.totalRealizedGainLoss > 0
      ? "text-emerald-600"
      : analytics.totalRealizedGainLoss < 0
        ? "text-red-600"
        : "text-slate-900";

  const returnClassName =
    analytics.realizedReturn > 0
      ? "text-emerald-600"
      : analytics.realizedReturn < 0
        ? "text-red-600"
        : "text-slate-900";

  const realizedPrefix =
    analytics.totalRealizedGainLoss > 0
      ? "+"
      : "";

  const returnPrefix =
    analytics.realizedReturn > 0
      ? "+"
      : "";

  if (analytics.sales.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-400">
          $
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          No realized gains yet
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Realized gains and losses will appear
          after you sell part or all of an
          investment position.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <p className="text-sm font-medium text-slate-500">
          Closed investment performance
        </p>

        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          Realized gains
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Profit or loss already locked in through
          investment sales. Investment transactions
          are calculated in USD.
        </p>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Realized gain / loss
          </p>

          <p
            className={`mt-2 text-xl font-bold ${gainLossClassName}`}
          >
            {realizedPrefix}
            {formatCurrencyFor(
              analytics.totalRealizedGainLoss,
              "USD",
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Profit or loss already closed.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Realized return
          </p>

          <p
            className={`mt-2 text-xl font-bold ${returnClassName}`}
          >
            {returnPrefix}
            {percentageFormatter.format(
              analytics.realizedReturn,
            )}
            %
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Return against sold cost basis.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Sale proceeds
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatCurrencyFor(
              analytics.totalProceeds,
              "USD",
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Total cash generated by sales.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Profitable sales
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {analytics.profitableSales} /{" "}
            {analytics.sales.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {percentageFormatter.format(
              analytics.winRate,
            )}
            % profitable ·{" "}
            {analytics.losingSales} losing
          </p>
        </article>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Symbol
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cost basis
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sale proceeds
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Realized gain
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Return
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cash destination
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {analytics.sales.map((transaction) => {
              const realizedGainLoss =
                transaction.realizedGainLoss ?? 0;

              const costBasis =
                transaction.amount -
                realizedGainLoss;

              const transactionReturn =
                costBasis > 0
                  ? (realizedGainLoss /
                      costBasis) *
                    100
                  : 0;

              const transactionClassName =
                realizedGainLoss > 0
                  ? "text-emerald-600"
                  : realizedGainLoss < 0
                    ? "text-red-600"
                    : "text-slate-600";

              const prefix =
                realizedGainLoss > 0
                  ? "+"
                  : "";

              const percentagePrefix =
                transactionReturn > 0
                  ? "+"
                  : "";

              return (
                <tr
                  key={transaction.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {dateFormatter.format(
                      new Date(transaction.date),
                    )}
                  </td>

                  <td className="px-5 py-4 text-sm font-bold text-slate-900">
                    {transaction.symbol}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600">
                    {formatCurrencyFor(
                      costBasis,
                      "USD",
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatCurrencyFor(
                      transaction.amount,
                      "USD",
                    )}
                  </td>

                  <td
                    className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold ${transactionClassName}`}
                  >
                    {prefix}
                    {formatCurrencyFor(
                      realizedGainLoss,
                      "USD",
                    )}
                  </td>

                  <td
                    className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold ${transactionClassName}`}
                  >
                    {percentagePrefix}
                    {percentageFormatter.format(
                      transactionReturn,
                    )}
                    %
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-600">
                    {transaction.cashAccountName ??
                      "Unassigned"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-xs leading-5 text-slate-400">
          JIS currently calculates realized gain or
          loss using the position&apos;s average cost
          at the moment of sale.
        </p>
      </div>
    </section>
  );
};

export default RealizedGains;