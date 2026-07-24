import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useCashStore from "../../store/cashStore";
import useDividendStore from "../../store/dividendStore";
import usePortfolioStore from "../../store/portfolioStore";

const percentageFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

const dateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

const getTodayInputValue = () => {
  const now = new Date();

  const localDate =
    new Date(
      now.getTime() -
        now.getTimezoneOffset() *
          60_000,
    );

  return localDate
    .toISOString()
    .slice(0, 10);
};

const DividendManager = () => {
  const positions =
    usePortfolioStore(
      (state) =>
        state.positions,
    );

  const cashAccounts =
    useCashStore(
      (state) =>
        state.accounts,
    );

  const records =
    useDividendStore(
      (state) =>
        state.records,
    );

  const defaultWithholdingRate =
    useDividendStore(
      (state) =>
        state.defaultWithholdingRate,
    );

  const setDefaultWithholdingRate =
    useDividendStore(
      (state) =>
        state.setDefaultWithholdingRate,
    );

  const recordDividend =
    useDividendStore(
      (state) =>
        state.recordDividend,
    );

  const reverseDividend =
    useDividendStore(
      (state) =>
        state.reverseDividend,
    );

  const {
    formatCurrencyFor,
  } = useCurrencyFormatter();

  const [
    symbol,
    setSymbol,
  ] = useState("");

  const [
    paymentDate,
    setPaymentDate,
  ] = useState(
    getTodayInputValue(),
  );

  const [
    grossAmount,
    setGrossAmount,
  ] = useState("");

  const [
    withholdingRate,
    setWithholdingRate,
  ] = useState(
    String(
      defaultWithholdingRate,
    ),
  );

  const [
    cashAccountId,
    setCashAccountId,
  ] = useState("");

  const [
    note,
    setNote,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const usdCashAccounts =
    useMemo(
      () =>
        cashAccounts.filter(
          (account) =>
            account.currency ===
            "USD",
        ),
      [cashAccounts],
    );

  const symbols =
    useMemo(
      () =>
        Array.from(
          new Set(
            positions.map(
              (position) =>
                position.symbol,
            ),
          ),
        ).sort(),
      [positions],
    );

  useEffect(() => {
    if (
      cashAccountId ||
      usdCashAccounts.length ===
        0
    ) {
      return;
    }

    const tybaCash =
      usdCashAccounts.find(
        (account) =>
          account.name
            .toLowerCase()
            .includes("tyba"),
      );

    setCashAccountId(
      (
        tybaCash ??
        usdCashAccounts[0]
      ).id,
    );
  }, [
    cashAccountId,
    usdCashAccounts,
  ]);

  const parsedGrossAmount =
    Number(grossAmount);

  const parsedWithholdingRate =
    Number(withholdingRate);

  const calculatedTax =
    Number.isFinite(
      parsedGrossAmount,
    ) &&
    parsedGrossAmount > 0 &&
    Number.isFinite(
      parsedWithholdingRate,
    ) &&
    parsedWithholdingRate >= 0 &&
    parsedWithholdingRate <= 100
      ? parsedGrossAmount *
        (parsedWithholdingRate /
          100)
      : 0;

  const calculatedNet =
    Math.max(
      parsedGrossAmount -
        calculatedTax,
      0,
    );

  const summary =
    useMemo(() => {
      const gross =
        records.reduce(
          (
            total,
            dividend,
          ) =>
            total +
            dividend.grossAmount,
          0,
        );

      const tax =
        records.reduce(
          (
            total,
            dividend,
          ) =>
            total +
            dividend.taxWithheld,
          0,
        );

      const net =
        records.reduce(
          (
            total,
            dividend,
          ) =>
            total +
            dividend.netAmount,
          0,
        );

      return {
        gross,
        tax,
        net,
      };
    }, [records]);

  const resetForm = () => {
    setSymbol("");

    setPaymentDate(
      getTodayInputValue(),
    );

    setGrossAmount("");

    setWithholdingRate(
      String(
        defaultWithholdingRate,
      ),
    );

    setNote("");

    setError("");
  };

  const handleDefaultRateChange = (
    value: string,
  ) => {
    const parsedValue =
      Number(value);

    const result =
      setDefaultWithholdingRate(
        parsedValue,
      );

    if (!result.success) {
      return;
    }

    setWithholdingRate(
      String(parsedValue),
    );
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const result =
      recordDividend({
        symbol,

        paymentDate:
          new Date(
            `${paymentDate}T12:00:00`,
          ).toISOString(),

        grossAmount:
          parsedGrossAmount,

        withholdingRate:
          parsedWithholdingRate,

        cashAccountId,

        note,
      });

    if (!result.success) {
      setError(
        result.error ??
          "Unable to record the dividend.",
      );

      return;
    }

    setSuccessMessage(
      `Dividend recorded. ${formatCurrencyFor(
        calculatedNet,
        "USD",
      )} was deposited into cash.`,
    );

    resetForm();
  };

  const handleReverse = (
    id: string,
    symbolValue: string,
    netAmount: number,
  ) => {
    const confirmed =
      window.confirm(
        `Reverse the ${symbolValue} dividend?\n\nJIS will remove ${formatCurrencyFor(
          netAmount,
          "USD",
        )} from the original cash account.`,
      );

    if (!confirmed) {
      return;
    }

    const result =
      reverseDividend(id);

    if (!result.success) {
      window.alert(
        result.error ??
          "Unable to reverse the dividend.",
      );
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <p className="text-sm font-medium text-slate-500">
          Investment income
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Dividends
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Record ETF distributions,
          calculate withholding tax and
          automatically deposit the net
          payment into your broker cash
          account.
        </p>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Gross dividends
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatCurrencyFor(
              summary.gross,
              "USD",
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Before withholding tax.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Tax withheld
          </p>

          <p className="mt-2 text-xl font-bold text-red-600">
            -
            {formatCurrencyFor(
              summary.tax,
              "USD",
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Withholding recorded by JIS.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Net dividends
          </p>

          <p className="mt-2 text-xl font-bold text-emerald-600">
            +
            {formatCurrencyFor(
              summary.net,
              "USD",
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Cash actually received.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Dividend payments
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {records.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Recorded distributions.
          </p>
        </article>
      </div>

      <div className="grid items-start gap-6 p-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900">
              Dividend settings
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              30% is the JIS default.
              Change it whenever the
              broker applies a different
              withholding rate.
            </p>

            <div className="mt-4">
              <label
                htmlFor="default-dividend-tax"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Default withholding
              </label>

              <div className="relative">
                <input
                  id="default-dividend-tax"
                  type="number"
                  value={
                    defaultWithholdingRate
                  }
                  onChange={(
                    event,
                  ) =>
                    handleDefaultRateChange(
                      event.target.value,
                    )
                  }
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-10 text-sm"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 p-5"
          >
            <div>
              <h3 className="font-semibold text-slate-900">
                Record dividend
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Enter the gross amount
                shown by Tyba. JIS
                calculates tax and
                deposits the net amount.
              </p>
            </div>

            <div>
              <label
                htmlFor="dividend-symbol"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                ETF symbol
              </label>

              <input
                id="dividend-symbol"
                list="jis-dividend-symbols"
                type="text"
                value={symbol}
                onChange={(
                  event,
                ) =>
                  setSymbol(
                    event.target.value.toUpperCase(),
                  )
                }
                placeholder="VOO"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase"
              />

              <datalist id="jis-dividend-symbols">
                {symbols.map(
                  (symbolValue) => (
                    <option
                      key={
                        symbolValue
                      }
                      value={
                        symbolValue
                      }
                    />
                  ),
                )}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="dividend-date"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Payment date
              </label>

              <input
                id="dividend-date"
                type="date"
                value={
                  paymentDate
                }
                onChange={(
                  event,
                ) =>
                  setPaymentDate(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="dividend-gross"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Gross dividend
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  $
                </span>

                <input
                  id="dividend-gross"
                  type="number"
                  value={
                    grossAmount
                  }
                  onChange={(
                    event,
                  ) =>
                    setGrossAmount(
                      event.target.value,
                    )
                  }
                  placeholder="50.00"
                  min="0"
                  step="any"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-9 pr-4 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="dividend-tax"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Withholding rate
              </label>

              <div className="relative">
                <input
                  id="dividend-tax"
                  type="number"
                  value={
                    withholdingRate
                  }
                  onChange={(
                    event,
                  ) =>
                    setWithholdingRate(
                      event.target.value,
                    )
                  }
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-10 text-sm"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                  %
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">
                  Gross
                </span>

                <span className="font-semibold text-slate-900">
                  {formatCurrencyFor(
                    Number.isFinite(
                      parsedGrossAmount,
                    )
                      ? parsedGrossAmount
                      : 0,
                    "USD",
                  )}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">
                  Tax withheld
                </span>

                <span className="font-semibold text-red-600">
                  -
                  {formatCurrencyFor(
                    calculatedTax,
                    "USD",
                  )}
                </span>
              </div>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-700">
                    Net to cash
                  </span>

                  <span className="text-lg font-bold text-emerald-600">
                    {formatCurrencyFor(
                      calculatedNet,
                      "USD",
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="dividend-cash-account"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Cash destination
              </label>

              <select
                id="dividend-cash-account"
                value={
                  cashAccountId
                }
                onChange={(
                  event,
                ) =>
                  setCashAccountId(
                    event.target.value,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="">
                  Select USD cash account
                </option>

                {usdCashAccounts.map(
                  (account) => (
                    <option
                      key={
                        account.id
                      }
                      value={
                        account.id
                      }
                    >
                      {account.name} —{" "}
                      {formatCurrencyFor(
                        account.balance,
                        "USD",
                      )}
                    </option>
                  ),
                )}
              </select>

              {usdCashAccounts.length ===
                0 && (
                <p className="mt-2 text-xs text-amber-600">
                  Create a USD cash
                  account before recording
                  dividends.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="dividend-note"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Note
              </label>

              <textarea
                id="dividend-note"
                value={note}
                onChange={(
                  event,
                ) =>
                  setNote(
                    event.target.value,
                  )
                }
                placeholder="Quarterly distribution"
                rows={2}
                maxLength={160}
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={
                usdCashAccounts.length ===
                0
              }
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Record and deposit dividend
            </button>
          </form>

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">
              Automatic calendar
            </p>

            <p className="mt-2 text-xs leading-5 text-blue-700">
              This accounting engine is
              ready for automatic dividend
              events. We are not connecting
              the current Twelve Data
              endpoint yet because it
              requires the Grow plan and
              does not provide the actual
              payment date.
            </p>
          </section>
        </div>

        <div className="min-w-0">
          {records.length ===
          0 ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-400 shadow-sm">
                  $
                </div>

                <h3 className="mt-4 font-semibold text-slate-900">
                  No dividends recorded
                </h3>

                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                  Your ETF dividend
                  payments will appear
                  here with gross income,
                  withholding and net cash
                  received.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1050px] w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Symbol
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Gross
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Withholding
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Tax
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Net
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Destination
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Note
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {records.map(
                    (dividend) => (
                      <tr
                        key={
                          dividend.id
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                          {dateFormatter.format(
                            new Date(
                              dividend.paymentDate,
                            ),
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm font-bold text-slate-900">
                          {dividend.symbol}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-slate-900">
                          {formatCurrencyFor(
                            dividend.grossAmount,
                            "USD",
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-600">
                          {percentageFormatter.format(
                            dividend.withholdingRate,
                          )}
                          %
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-red-600">
                          -
                          {formatCurrencyFor(
                            dividend.taxWithheld,
                            "USD",
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-emerald-600">
                          +
                          {formatCurrencyFor(
                            dividend.netAmount,
                            "USD",
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {
                            dividend.cashAccountName
                          }
                        </td>

                        <td className="max-w-52 px-4 py-4 text-sm text-slate-500">
                          {dividend.note ??
                            "—"}
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleReverse(
                                dividend.id,
                                dividend.symbol,
                                dividend.netAmount,
                              )
                            }
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            Reverse
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DividendManager;