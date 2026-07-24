import {
  useMemo,
  useState,
  type FormEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useCashStore, {
  type CashMovementType,
} from "../../store/cashStore";
import useSettingsStore from "../../store/settingsStore";

const dateFormatter =
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const movementLabels: Record<
  CashMovementType,
  string
> = {
  opening_balance:
    "Opening balance",

  external_deposit:
    "External deposit",

  external_withdrawal:
    "External withdrawal",

  investment_buy:
    "Investment buy",

  investment_sell:
    "Investment sale",

  dividend:
    "Dividend",

  adjustment:
    "Adjustment",
};

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

const CashMovementManager = () => {
  const accounts =
    useCashStore(
      (state) =>
        state.accounts,
    );

  const movements =
    useCashStore(
      (state) =>
        state.movements,
    );

  const addExternalDeposit =
    useCashStore(
      (state) =>
        state.addExternalDeposit,
    );

  const addExternalWithdrawal =
    useCashStore(
      (state) =>
        state.addExternalWithdrawal,
    );

  const fxBaseCurrency =
    useCashStore(
      (state) =>
        state.fxBaseCurrency,
    );

  const fxRates =
    useCashStore(
      (state) =>
        state.fxRates,
    );

  const reportingCurrency =
    useSettingsStore(
      (state) =>
        state.settings.currency,
    );

  const {
    formatCurrency,
    formatCurrencyFor,
  } = useCurrencyFormatter();

  const [
    movementType,
    setMovementType,
  ] = useState<
    "deposit" | "withdrawal"
  >("deposit");

  const [
    accountId,
    setAccountId,
  ] = useState("");

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    date,
    setDate,
  ] = useState(
    getTodayInputValue(),
  );

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

  const selectedAccount =
    accounts.find(
      (account) =>
        account.id === accountId,
    ) ?? null;

  const convertToReportingCurrency = (
    value: number,
    currency:
      typeof reportingCurrency,
  ) => {
    if (
      currency ===
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
      fxRates[currency];

    if (
      rate === undefined ||
      !Number.isFinite(rate) ||
      rate <= 0
    ) {
      return null;
    }

    return value * rate;
  };

  const summary =
    useMemo(() => {
      let deposits = 0;
      let withdrawals = 0;
      let missingFx = false;

      movements.forEach(
        (movement) => {
          if (
            movement.type !==
              "external_deposit" &&
            movement.type !==
              "external_withdrawal"
          ) {
            return;
          }

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

      return {
        deposits,
        withdrawals,

        netContributions:
          deposits -
          withdrawals,

        missingFx,
      };
    }, [
      movements,
      fxBaseCurrency,
      fxRates,
      reportingCurrency,
    ]);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const parsedAmount =
      Number(amount);

    if (!accountId) {
      setError(
        "Select the cash account.",
      );

      return;
    }

    if (
      !Number.isFinite(
        parsedAmount,
      ) ||
      parsedAmount <= 0
    ) {
      setError(
        "Amount must be greater than zero.",
      );

      return;
    }

    const movementDate =
      new Date(
        `${date}T12:00:00`,
      );

    if (
      Number.isNaN(
        movementDate.getTime(),
      )
    ) {
      setError(
        "Enter a valid date.",
      );

      return;
    }

    const result =
      movementType ===
      "deposit"
        ? addExternalDeposit(
            accountId,

            parsedAmount,

            movementDate.toISOString(),

            note,
          )
        : addExternalWithdrawal(
            accountId,

            parsedAmount,

            movementDate.toISOString(),

            note,
          );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to record cash movement.",
      );

      return;
    }

    setSuccessMessage(
      movementType ===
      "deposit"
        ? "External contribution deposited successfully."
        : "External withdrawal recorded successfully.",
    );

    setAmount("");
    setNote("");
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <p className="text-sm font-medium text-slate-500">
          Cash ledger
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Cash movements
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Track money entering and
          leaving JIS separately from
          investment purchases, sales
          and dividends.
        </p>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            External deposits
          </p>

          <p className="mt-2 text-xl font-bold text-blue-600">
            +
            {formatCurrency(
              summary.deposits,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Money you added to JIS.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            External withdrawals
          </p>

          <p className="mt-2 text-xl font-bold text-red-600">
            -
            {formatCurrency(
              summary.withdrawals,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Money removed from JIS.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Net contributions
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatCurrency(
              summary.netContributions,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Deposits minus
            withdrawals.
          </p>
        </article>
      </div>

      <div className="grid items-start gap-6 p-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 p-5"
        >
          <div>
            <h3 className="font-semibold text-slate-900">
              External cash movement
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Use Deposit when you send
              money from your bank to
              Tyba Cash.
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMovementType(
                  "deposit",
                );

                setError("");
              }}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                movementType ===
                "deposit"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Deposit
            </button>

            <button
              type="button"
              onClick={() => {
                setMovementType(
                  "withdrawal",
                );

                setError("");
              }}
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                movementType ===
                "withdrawal"
                  ? "bg-white text-red-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Withdrawal
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Cash account
            </label>

            <select
              value={accountId}
              onChange={(
                event,
              ) =>
                setAccountId(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="">
                Select account
              </option>

              {accounts.map(
                (account) => (
                  <option
                    key={account.id}
                    value={account.id}
                  >
                    {account.name} —{" "}
                    {formatCurrencyFor(
                      account.balance,
                      account.currency,
                    )}
                  </option>
                ),
              )}
            </select>

            {selectedAccount && (
              <p className="mt-2 text-xs text-slate-400">
                Available balance:{" "}
                {formatCurrencyFor(
                  selectedAccount.balance,
                  selectedAccount.currency,
                )}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Amount
            </label>

            <input
              type="number"
              value={amount}
              onChange={(
                event,
              ) =>
                setAmount(
                  event.target.value,
                )
              }
              placeholder="1500"
              min="0"
              step="any"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Date
            </label>

            <input
              type="date"
              value={date}
              onChange={(
                event,
              ) =>
                setDate(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Note
            </label>

            <input
              type="text"
              value={note}
              onChange={(
                event,
              ) =>
                setNote(
                  event.target.value,
                )
              }
              placeholder="Monthly contribution"
              maxLength={160}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
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
              accounts.length === 0
            }
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {movementType ===
            "deposit"
              ? "Record deposit"
              : "Record withdrawal"}
          </button>
        </form>

        <div className="min-w-0">
          {movements.length ===
          0 ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div>
                <h3 className="font-semibold text-slate-900">
                  No cash movements
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Deposits, purchases,
                  sales and dividends
                  will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[950px] w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Date
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Account
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Movement
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Asset
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">
                      Amount
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                      Note
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {movements.map(
                    (movement) => (
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

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {
                            movementLabels[
                              movement.type
                            ]
                          }
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                          {movement.symbol ??
                            "—"}
                        </td>

                        <td
                          className={`whitespace-nowrap px-4 py-4 text-right text-sm font-bold ${
                            movement.amount >
                            0
                              ? "text-emerald-600"
                              : movement.amount <
                                  0
                                ? "text-red-600"
                                : "text-slate-600"
                          }`}
                        >
                          {movement.amount >
                          0
                            ? "+"
                            : ""}
                          {formatCurrencyFor(
                            movement.amount,
                            movement.currency,
                          )}
                        </td>

                        <td className="max-w-64 px-4 py-4 text-sm text-slate-500">
                          {movement.note ??
                            "—"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {summary.missingFx && (
            <p className="mt-3 text-xs text-amber-600">
              Some contribution totals
              are waiting for current FX
              rates.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default CashMovementManager;