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

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
});

const getMonthKey = (date: Date) => {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  return `${year}-${month}`;
};

const createRecentMonths = (): MonthlyCashFlow[] => {
  const today = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(
      today.getFullYear(),
      today.getMonth() - (5 - index),
      1,
    );

    return {
      key: getMonthKey(monthDate),
      label: monthFormatter.format(monthDate),
      purchases: 0,
      sales: 0,
      net: 0,
    };
  });
};

const MonthlyCashFlowChart = () => {
  const transactions = usePortfolioStore(
    (state) => state.transactions,
  );

  const {
    formatCurrency,
    formatCompactCurrency,
  } = useCurrencyFormatter();

  const chartData = useMemo(() => {
    const recentMonths = createRecentMonths();

    const monthsByKey = new Map(
      recentMonths.map((month) => [
        month.key,
        month,
      ]),
    );

    transactions.forEach((transaction) => {
      if (transaction.type === "opening") {
        return;
      }

      const transactionDate = new Date(
        transaction.date,
      );

      if (Number.isNaN(transactionDate.getTime())) {
        return;
      }

      const month = monthsByKey.get(
        getMonthKey(transactionDate),
      );

      if (!month) {
        return;
      }

      if (transaction.type === "buy") {
        month.purchases += transaction.amount;
      }

      if (transaction.type === "sell") {
        month.sales += transaction.amount;
      }
    });

    recentMonths.forEach((month) => {
      month.net = month.purchases - month.sales;
    });

    const totalPurchases = recentMonths.reduce(
      (total, month) =>
        total + month.purchases,
      0,
    );

    const totalSales = recentMonths.reduce(
      (total, month) => total + month.sales,
      0,
    );

    const maximumAmount = Math.max(
      ...recentMonths.flatMap((month) => [
        month.purchases,
        month.sales,
      ]),
      1,
    );

    return {
      months: recentMonths,
      totalPurchases,
      totalSales,
      maximumAmount,
      hasActivity:
        totalPurchases > 0 || totalSales > 0,
    };
  }, [transactions]);

  const getBarHeight = (amount: number) => {
    if (amount <= 0) {
      return 0;
    }

    return Math.max(
      (amount / chartData.maximumAmount) * 160,
      4,
    );
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Monthly cash flow
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Purchases and sales recorded during the last
            six months.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">
              Purchases
            </p>

            <p className="mt-1 font-semibold text-emerald-700">
              {formatCurrency(
                chartData.totalPurchases,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Sales
            </p>

            <p className="mt-1 font-semibold text-red-700">
              {formatCurrency(chartData.totalSales)}
            </p>
          </div>
        </div>
      </div>

      {!chartData.hasActivity ? (
        <div className="mt-6 flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              $
            </div>

            <h3 className="mt-4 font-semibold text-slate-900">
              No transaction activity
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Purchases and sales will appear in this
              chart.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-6 gap-4">
                {chartData.months.map((month) => (
                  <div
                    key={month.key}
                    className="flex flex-col"
                  >
                    <div className="flex h-44 items-end justify-center gap-2 border-b border-slate-200">
                      <div
                        title={`Purchases: ${formatCurrency(
                          month.purchases,
                        )}`}
                        className="w-6 rounded-t-md bg-emerald-500 transition hover:bg-emerald-600"
                        style={{
                          height: `${getBarHeight(
                            month.purchases,
                          )}px`,
                        }}
                      />

                      <div
                        title={`Sales: ${formatCurrency(
                          month.sales,
                        )}`}
                        className="w-6 rounded-t-md bg-red-400 transition hover:bg-red-500"
                        style={{
                          height: `${getBarHeight(
                            month.sales,
                          )}px`,
                        }}
                      />
                    </div>

                    <div className="pt-3 text-center">
                      <p className="text-sm font-semibold text-slate-700">
                        {month.label}
                      </p>

                      <p
                        className={`mt-1 text-xs font-medium ${
                          month.net > 0
                            ? "text-emerald-600"
                            : month.net < 0
                              ? "text-red-600"
                              : "text-slate-400"
                        }`}
                      >
                        Net{" "}
                        {formatCompactCurrency(month.net)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" />
              Purchases
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-red-400" />
              Sales
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default MonthlyCashFlowChart;