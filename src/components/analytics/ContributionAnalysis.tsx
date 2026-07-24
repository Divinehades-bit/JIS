import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useWealthSummary from "../../hooks/useWealthSummary";
import useCashStore from "../../store/cashStore";
import useSettingsStore from "../../store/settingsStore";

const dateFormatter =
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const ContributionAnalysis = () => {
  const movements = useCashStore(
    (state) => state.movements,
  );

  const fxBaseCurrency =
    useCashStore(
      (state) =>
        state.fxBaseCurrency,
    );

  const fxRates = useCashStore(
    (state) => state.fxRates,
  );

  const reportingCurrency =
    useSettingsStore(
      (state) =>
        state.settings.currency,
    );

  const wealth =
    useWealthSummary();

  const {
    formatCurrency,
    formatCurrencyFor,
    formatSignedCurrency,
  } = useCurrencyFormatter();

  const convertToReportingCurrency = (
    value: number,
    sourceCurrency:
      typeof reportingCurrency,
  ) => {
    if (
      sourceCurrency ===
      reportingCurrency
    ) {
      return value;
    }

    if (
      fxBaseCurrency !==
      reportingCurrency
    ) {
      return null;
    }

    const rate =
      fxRates[sourceCurrency];

    if (
      rate === undefined ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return null;
    }

    return value * rate;
  };

  const analytics =
    useMemo(() => {
      const now =
        Date.now();

      const thirtyDaysAgo =
        now -
        30 *
          24 *
          60 *
          60 *
          1000;

      const twelveMonthsAgo =
        now -
        365 *
          24 *
          60 *
          60 *
          1000;

      const externalMovements =
        movements
          .filter(
            (movement) =>
              movement.type ===
                "external_deposit" ||
              movement.type ===
                "external_withdrawal",
          )
          .sort(
            (
              first,
              second,
            ) =>
              new Date(
                second.date,
              ).getTime() -
              new Date(
                first.date,
              ).getTime(),
          );

      let deposits = 0;
      let withdrawals = 0;

      let last30DaysNet = 0;
      let last12MonthsNet = 0;

      let internalPurchases = 0;

      let missingFx = false;

      externalMovements.forEach(
        (movement) => {
          const converted =
            convertToReportingCurrency(
              Math.abs(
                movement.amount,
              ),
              movement.currency,
            );

          if (
            converted === null
          ) {
            missingFx = true;
            return;
          }

          const movementTime =
            new Date(
              movement.date,
            ).getTime();

          const signedAmount =
            movement.type ===
            "external_deposit"
              ? converted
              : -converted;

          if (
            movement.type ===
            "external_deposit"
          ) {
            deposits += converted;
          } else {
            withdrawals +=
              converted;
          }

          if (
            movementTime >=
            thirtyDaysAgo
          ) {
            last30DaysNet +=
              signedAmount;
          }

          if (
            movementTime >=
            twelveMonthsAgo
          ) {
            last12MonthsNet +=
              signedAmount;
          }
        },
      );

      movements
        .filter(
          (movement) =>
            movement.type ===
            "investment_buy",
        )
        .forEach(
          (movement) => {
            const converted =
              convertToReportingCurrency(
                Math.abs(
                  movement.amount,
                ),
                movement.currency,
              );

            if (
              converted === null
            ) {
              missingFx = true;
              return;
            }

            internalPurchases +=
              converted;
          },
        );

      return {
        externalMovements,

        deposits,

        withdrawals,

        netContributions:
          deposits -
          withdrawals,

        last30DaysNet,

        last12MonthsNet,

        averageMonthly12Months:
          last12MonthsNet /
          12,

        internalPurchases,

        missingFx,
      };
    }, [
      movements,
      fxBaseCurrency,
      fxRates,
      reportingCurrency,
    ]);

  const investmentProfit =
    wealth.totalInvestmentProfit ===
    null
      ? "FX pending"
      : formatSignedCurrency(
          wealth.totalInvestmentProfit,
        );

  const investmentProfitClass =
    wealth.totalInvestmentProfit ===
      null ||
    wealth.totalInvestmentProfit ===
      0
      ? "text-slate-900"
      : wealth.totalInvestmentProfit >
          0
        ? "text-emerald-600"
        : "text-red-600";

  const netContributionClass =
    analytics.netContributions >
    0
      ? "text-blue-600"
      : analytics.netContributions <
          0
        ? "text-red-600"
        : "text-slate-900";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <p className="text-sm font-medium text-slate-500">
          Money added vs performance
        </p>

        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          Contributions
        </h2>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          Separate money transferred
          into JIS from investment
          performance generated inside
          your portfolio.
        </p>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            External deposits
          </p>

          <p className="mt-2 text-xl font-bold text-blue-600">
            +
            {formatCurrency(
              analytics.deposits,
            )}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Money transferred from
            outside JIS.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            External withdrawals
          </p>

          <p className="mt-2 text-xl font-bold text-red-600">
            -
            {formatCurrency(
              analytics.withdrawals,
            )}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Money removed from JIS.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Net contributions
          </p>

          <p
            className={`mt-2 text-xl font-bold ${netContributionClass}`}
          >
            {formatSignedCurrency(
              analytics.netContributions,
            )}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Deposits minus external
            withdrawals.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Investment profit
          </p>

          <p
            className={`mt-2 text-xl font-bold ${investmentProfitClass}`}
          >
            {investmentProfit}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Unrealized + realized +
            net dividends.
          </p>
        </article>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900">
              External cash flow
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Only deposits from
              outside JIS and
              withdrawals leaving JIS
              appear here.
            </p>
          </div>

          {analytics
            .externalMovements
            .length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div>
                <h4 className="font-semibold text-slate-900">
                  No external cash
                  movements yet
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  Your next deposit
                  from your bank to
                  Tyba Cash will appear
                  here.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[760px] w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Account
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Type
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Amount
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Note
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {analytics.externalMovements
                    .slice(0, 30)
                    .map(
                      (
                        movement,
                      ) => {
                        const isDeposit =
                          movement.type ===
                          "external_deposit";

                        return (
                          <tr
                            key={
                              movement.id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {dateFormatter.format(
                                new Date(
                                  movement.date,
                                ),
                              )}
                            </td>

                            <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                              {
                                movement.cashAccountName
                              }
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  isDeposit
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {isDeposit
                                  ? "Deposit"
                                  : "Withdrawal"}
                              </span>
                            </td>

                            <td
                              className={`whitespace-nowrap px-4 py-4 text-right text-sm font-bold ${
                                isDeposit
                                  ? "text-blue-600"
                                  : "text-red-600"
                              }`}
                            >
                              {isDeposit
                                ? "+"
                                : "-"}
                              {formatCurrencyFor(
                                Math.abs(
                                  movement.amount,
                                ),
                                movement.currency,
                              )}
                            </td>

                            <td className="max-w-64 px-4 py-4 text-sm text-slate-500">
                              {movement.note ??
                                "—"}
                            </td>
                          </tr>
                        );
                      },
                    )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500">
              Last 30 days
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatSignedCurrency(
                analytics.last30DaysNet,
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Net external capital
              added during the last
              30 days.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500">
              Last 12 months
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatSignedCurrency(
                analytics.last12MonthsNet,
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Average{" "}
              {formatCurrency(
                analytics.averageMonthly12Months,
              )}{" "}
              per month.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500">
              Internal investment buys
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatCurrency(
                analytics.internalPurchases,
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Cash moved from accounts
              such as Tyba Cash into
              ETFs.
            </p>

            <p className="mt-3 text-xs font-semibold text-emerald-600">
              Not counted as new money.
            </p>
          </article>

          <article className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">
              Your normal Tyba flow
            </p>

            <div className="mt-4 space-y-3 text-xs leading-5 text-blue-800">
              <p>
                <strong>
                  Bank → Tyba Cash:
                </strong>{" "}
                contribution.
              </p>

              <p>
                <strong>
                  Tyba Cash → ETF:
                </strong>{" "}
                internal movement.
              </p>

              <p>
                <strong>
                  ETF sale → Tyba
                  Cash:
                </strong>{" "}
                internal movement.
              </p>

              <p>
                <strong>
                  Dividend → Tyba
                  Cash:
                </strong>{" "}
                investment income.
              </p>
            </div>
          </article>
        </aside>
      </div>

      {analytics.missingFx && (
        <div className="border-t border-amber-100 bg-amber-50 px-5 py-4 text-xs text-amber-700">
          Some contribution values are
          waiting for updated FX
          rates.
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-xs leading-5 text-slate-400">
          Historical balances that
          existed before the Cash
          Ledger was introduced are
          classified as Opening
          Balance, not as external
          contributions. From now on,
          deposits and withdrawals are
          tracked explicitly.
        </p>
      </div>
    </section>
  );
};

export default ContributionAnalysis;