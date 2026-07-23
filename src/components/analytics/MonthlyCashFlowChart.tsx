import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

type MonthlyCashFlow = {
  key: string;
  label: string;
  purchases: number;
  sales: number;
  net: number;
};

const monthFormatter =
  new Intl.DateTimeFormat("en-US", {
    month: "short",
  });

const getMonthKey = (date: Date) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  return `${year}-${month}`;
};

const createRecentMonths =
  (): MonthlyCashFlow[] => {
    const today = new Date();

    return Array.from(
      { length: 6 },
      (_, index) => {
        const monthDate = new Date(
          today.getFullYear(),
          today.getMonth() -
            (5 - index),
          1,
        );

        return {
          key: getMonthKey(monthDate),

          label:
            monthFormatter.format(
              monthDate,
            ),

          purchases: 0,
          sales: 0,
          net: 0,
        };
      },
    );
  };

const MonthlyCashFlowChart = () => {
  const transactions =
    usePortfolioStore(
      (state) =>
        state.transactions,
    );

  const {
    formatCurrencyFor,
  } = useCurrencyFormatter();

  const chartData = useMemo(() => {
    const recentMonths =
      createRecentMonths();

    const monthsByKey = new Map(
      recentMonths.map((month) => [
        month.key,
        month,
      ]),
    );

    transactions.forEach(
      (transaction) => {
        if (
          transaction.type ===
          "opening"
        ) {
          return;
        }

        const transactionDate =
          new Date(
            transaction.date,
          );

        if (
          Number.isNaN(
            transactionDate.getTime(),
          )
        ) {
          return;
        }

        const month =
          monthsByKey.get(
            getMonthKey(
              transactionDate,
            ),
          );

        if (!month) {
          return;
        }

        if (
          transaction.type === "buy"
        ) {
          month.purchases +=
            transaction.amount;
        }

        if (
          transaction.type ===
          "sell"
        ) {
          month.sales +=
            transaction.amount;
        }
      },
    );

    recentMonths.forEach(
      (month) => {
        month.net =
          month.sales -
          month.purchases;
      },
    );

    const totalPurchases =
      recentMonths.reduce(
        (total, month) =>
          total +
          month.purchases,
        0,
      );

    const totalSales =
      recentMonths.reduce(
        (total, month) =>
          total + month.sales,
        0,
      );

    const maximumAmount =
      Math.max(
        ...recentMonths.flatMap(
          (month) => [
            month.purchases,
            month.sales,
          ],
        ),
        1,
      );

    return {
      months: recentMonths,
      totalPurchases,
      totalSales,
      maximumAmount,

      hasActivity:
        totalPurchases > 0 ||
        totalSales > 0,
    };
  }, [transactions]);

  const getBarHeight = (
    amount: number,
  ) => {
    if (amount <= 0) {
      return 0;
    }

    return Math.max(
      (amount /
        chartData.maximumAmount) *
        160,
      4,
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Investment cash flow
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Purchases and sales recorded during
          the last six months. Investment
          transactions are tracked in USD.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-400">
            Purchases
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatCurrencyFor(
              chartData.totalPurchases,
              "USD",
            )}
          </p>
        </article>

        <article className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-400">
            Sales
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {formatCurrencyFor(
              chartData.totalSales,
              "USD",
            )}
          </p>
        </article>
      </div>

      {!chartData.hasActivity ? (
        <div className="mt-6 flex min-h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
          <div>
            <p className="text-xl font-bold text-slate-300">
              $
            </p>

            <h3 className="mt-2 font-semibold text-slate-900">
              No transaction activity
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Purchases and sales will appear
              in this chart.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 flex h-52 items-end justify-between gap-3">
            {chartData.months.map(
              (month) => (
                <div
                  key={month.key}
                  className="flex min-w-0 flex-1 flex-col items-center"
                >
                  <div className="flex h-40 items-end gap-1.5">
                    <div
                      title={`Purchases: ${formatCurrencyFor(
                        month.purchases,
                        "USD",
                      )}`}
                      className="w-3 rounded-t bg-blue-600"
                      style={{
                        height: `${getBarHeight(
                          month.purchases,
                        )}px`,
                      }}
                    />

                    <div
                      title={`Sales: ${formatCurrencyFor(
                        month.sales,
                        "USD",
                      )}`}
                      className="w-3 rounded-t bg-emerald-500"
                      style={{
                        height: `${getBarHeight(
                          month.sales,
                        )}px`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {month.label}
                  </p>

                  <p
                    className={`mt-1 text-[10px] font-medium ${
                      month.net > 0
                        ? "text-emerald-600"
                        : month.net < 0
                          ? "text-red-600"
                          : "text-slate-400"
                    }`}
                  >
                    Net{" "}
                    {formatCurrencyFor(
                      month.net,
                      "USD",
                    )}
                  </p>
                </div>
              ),
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-blue-600" />
              Purchases
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-emerald-500" />
              Sales
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default MonthlyCashFlowChart;