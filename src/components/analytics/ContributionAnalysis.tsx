import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useWealthSummary from "../../hooks/useWealthSummary";
import useCashStore, {
  type CashMovement,
} from "../../store/cashStore";
import useSettingsStore from "../../store/settingsStore";

const dateFormatter =
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const BALANCE_TOLERANCE =
  0.00000001;

const REVERSAL_NOTE_PREFIX =
  "JIS reversal:";

const isReversalMovement = (
  movement: CashMovement,
) => {
  return (
    movement.type === "adjustment" &&
    Boolean(movement.relatedId) &&
    Boolean(
      movement.note?.startsWith(
        REVERSAL_NOTE_PREFIX,
      ),
    )
  );
};

const isExternalMovement = (
  movement: CashMovement,
) => {
  return (
    movement.type ===
      "external_deposit" ||
    movement.type ===
      "external_withdrawal"
  );
};

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

  const reversedMovementIds =
    useMemo(() => {
      return new Set(
        movements
          .filter(
            isReversalMovement,
          )
          .map(
            (movement) =>
              movement.relatedId,
          )
          .filter(
            (
              relatedId,
            ): relatedId is string =>
              Boolean(relatedId),
          ),
      );
    }, [movements]);

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

      /*
       * Original deposits and
       * withdrawals.
       */
      const externalMovements =
        movements.filter(
          isExternalMovement,
        );

      /*
       * Current valid contributions.
       *
       * Entries that were reversed are
       * excluded from the current
       * contribution totals.
       */
      const activeExternalMovements =
        externalMovements.filter(
          (movement) =>
            !reversedMovementIds.has(
              movement.id,
            ),
        );

      /*
       * Audit history includes original
       * external movements plus their
       * reversal adjustments.
       */
      const externalHistoryMovements =
        movements
          .filter(
            (movement) =>
              isExternalMovement(
                movement,
              ) ||
              isReversalMovement(
                movement,
              ),
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

      /*
       * Current contribution totals.
       */
      activeExternalMovements.forEach(
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

          if (
            movement.type ===
            "external_deposit"
          ) {
            deposits += converted;
          } else {
            withdrawals +=
              converted;
          }
        },
      );

      /*
       * Period analysis uses actual
       * dated cash flows.
       *
       * Example:
       *
       * Deposit       +1500
       * Later reversal -1500
       *
       * Period net flow = 0.
       *
       * This also works when the
       * deposit and reversal fall in
       * different reporting periods.
       */
      externalHistoryMovements.forEach(
        (movement) => {
          const converted =
            convertToReportingCurrency(
              movement.amount,
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

          if (
            !Number.isFinite(
              movementTime,
            )
          ) {
            return;
          }

          if (
            movementTime >=
            thirtyDaysAgo
          ) {
            last30DaysNet +=
              converted;
          }

          if (
            movementTime >=
            twelveMonthsAgo
          ) {
            last12MonthsNet +=
              converted;
          }
        },
      );

      /*
       * ETF purchases from Cash are
       * internal transfers, not new
       * contributions.
       */
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
        externalHistoryMovements,

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

        reversedCount:
          reversedMovementIds.size,

        missingFx,
      };
    }, [
      movements,
      reversedMovementIds,
      fxBaseCurrency,
      fxRates,
      reportingCurrency,
    ]);

  const normalizeZero = (
    value: number,
  ) => {
    return Math.abs(value) <=
      BALANCE_TOLERANCE
      ? 0
      : value;
  };

  const formatSignedOrZero = (
    value: number,
  ) => {
    const normalized =
      normalizeZero(value);

    return normalized === 0
      ? formatCurrency(0)
      : formatSignedCurrency(
          normalized,
        );
  };

  const formatPositiveTotal = (
    value: number,
  ) => {
    const normalized =
      normalizeZero(value);

    return normalized === 0
      ? formatCurrency(0)
      : `+${formatCurrency(
          normalized,
        )}`;
  };

  const formatNegativeTotal = (
    value: number,
  ) => {
    const normalized =
      normalizeZero(value);

    return normalized === 0
      ? formatCurrency(0)
      : `-${formatCurrency(
          normalized,
        )}`;
  };

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

  const normalizedNetContributions =
    normalizeZero(
      analytics.netContributions,
    );

  const netContributionClass =
    normalizedNetContributions > 0
      ? "text-blue-600"
      : normalizedNetContributions < 0
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

          <p
            className={`mt-2 text-xl font-bold ${
              analytics.deposits >
              BALANCE_TOLERANCE
                ? "text-blue-600"
                : "text-slate-900"
            }`}
          >
            {formatPositiveTotal(
              analytics.deposits,
            )}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Valid money transferred
            from outside JIS.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            External withdrawals
          </p>

          <p
            className={`mt-2 text-xl font-bold ${
              analytics.withdrawals >
              BALANCE_TOLERANCE
                ? "text-red-600"
                : "text-slate-900"
            }`}
          >
            {formatNegativeTotal(
              analytics.withdrawals,
            )}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Valid money removed from
            JIS.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Net contributions
          </p>

          <p
            className={`mt-2 text-xl font-bold ${netContributionClass}`}
          >
            {formatSignedOrZero(
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
              Deposits, withdrawals and
              their corrections remain
              visible for a complete
              audit trail.
            </p>
          </div>

          {analytics
            .externalHistoryMovements
            .length === 0 ? (
            <div className="flex min-h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div>
                <h4 className="font-semibold text-slate-900">
                  No external cash
                  movements yet
                </h4>

                <p className="mt-2 text-sm text-slate-500">
                  Your next transfer
                  from your bank to
                  Tyba Cash will appear
                  here.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[820px] w-full">
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
                  {analytics.externalHistoryMovements
                    .slice(0, 30)
                    .map(
                      (
                        movement,
                      ) => {
                        const reversal =
                          isReversalMovement(
                            movement,
                          );

                        const reversed =
                          reversedMovementIds.has(
                            movement.id,
                          );

                        const isDeposit =
                          movement.type ===
                          "external_deposit";

                        const amountPositive =
                          movement.amount >
                          0;

                        return (
                          <tr
                            key={
                              movement.id
                            }
                            className={
                              reversed
                                ? "bg-slate-50/70"
                                : "hover:bg-slate-50"
                            }
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
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    reversal
                                      ? "bg-slate-100 text-slate-700"
                                      : isDeposit
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  {reversal
                                    ? "Reversal"
                                    : isDeposit
                                      ? "Deposit"
                                      : "Withdrawal"}
                                </span>

                                {reversed && (
                                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                    Reversed
                                  </span>
                                )}
                              </div>
                            </td>

                            <td
                              className={`whitespace-nowrap px-4 py-4 text-right text-sm font-bold ${
                                amountPositive
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              }`}
                            >
                              {amountPositive
                                ? "+"
                                : ""}
                              {formatCurrencyFor(
                                movement.amount,
                                movement.currency,
                              )}
                            </td>

                            <td className="max-w-72 px-4 py-4 text-sm leading-5 text-slate-500">
                              <div className="whitespace-normal break-words">
                                {movement.note ??
                                  "—"}
                              </div>
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
              {formatSignedOrZero(
                analytics.last30DaysNet,
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Net external capital
              after deposits,
              withdrawals and
              corrections.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500">
              Last 12 months
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatSignedOrZero(
                analytics.last12MonthsNet,
              )}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Average{" "}
              {formatSignedOrZero(
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

          {analytics.reversedCount >
            0 && (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-medium text-slate-500">
                Corrected entries
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {
                  analytics.reversedCount
                }
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Reversed deposits or
                withdrawals excluded
                from current
                contribution totals.
              </p>
            </article>
          )}

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
          A reversal never deletes the
          original movement. JIS keeps
          both records for audit
          purposes while excluding the
          corrected entry from current
          contribution totals.
        </p>
      </div>
    </section>
  );
};

export default ContributionAnalysis;