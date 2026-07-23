import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useCashStore, {
  type CashAccount,
} from "../../store/cashStore";
import useSettingsStore, {
  supportedCurrencies,
  type CurrencyCode,
} from "../../store/settingsStore";

const FX_STALE_TIME_MS =
  6 * 60 * 60 * 1000;

const currencyNames: Record<
  CurrencyCode,
  string
> = {
  USD: "US Dollar",
  PEN: "Peruvian Sol",
  EUR: "Euro",
  QAR: "Qatari Riyal",
};

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateTimeFormatter =
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const CashManager = () => {
  const baseCurrency = useSettingsStore(
    (state) => state.settings.currency,
  );

  const {
    formatCurrency,
    formatCurrencyFor,
  } = useCurrencyFormatter();

  const accounts = useCashStore(
    (state) => state.accounts,
  );

  const fxBaseCurrency = useCashStore(
    (state) => state.fxBaseCurrency,
  );

  const fxRates = useCashStore(
    (state) => state.fxRates,
  );

  const fxUpdatedAt = useCashStore(
    (state) => state.fxUpdatedAt,
  );

  const fxSyncStatus = useCashStore(
    (state) => state.fxSyncStatus,
  );

  const fxSyncError = useCashStore(
    (state) => state.fxSyncError,
  );

  const addAccount = useCashStore(
    (state) => state.addAccount,
  );

  const updateAccount = useCashStore(
    (state) => state.updateAccount,
  );

  const removeAccount = useCashStore(
    (state) => state.removeAccount,
  );

  const refreshFxRates = useCashStore(
    (state) => state.refreshFxRates,
  );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [name, setName] = useState("");

  const [institution, setInstitution] =
    useState("");

  const [currency, setCurrency] =
    useState<CurrencyCode>("USD");

  const [balance, setBalance] =
    useState("");

  const [annualYield, setAnnualYield] =
    useState("0");

  const [formError, setFormError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const isFxLoading =
    fxSyncStatus === "loading";

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setInstitution("");
    setCurrency("USD");
    setBalance("");
    setAnnualYield("0");
    setFormError("");
  };

  const accountMetrics = useMemo(() => {
    return accounts.map((account) => {
      const rate =
        fxBaseCurrency === baseCurrency
          ? fxRates[account.currency]
          : undefined;

      const validRate =
        rate !== undefined &&
        Number.isFinite(rate) &&
        rate > 0
          ? rate
          : null;

      const annualInterestOriginal =
        account.balance *
        (account.annualYield / 100);

      const monthlyInterestOriginal =
        annualInterestOriginal / 12;

      return {
        account,
        rate: validRate,

        convertedBalance:
          validRate === null
            ? null
            : account.balance * validRate,

        annualInterestOriginal,

        monthlyInterestOriginal,

        convertedAnnualInterest:
          validRate === null
            ? null
            : annualInterestOriginal *
              validRate,
      };
    });
  }, [
    accounts,
    baseCurrency,
    fxBaseCurrency,
    fxRates,
  ]);

  const summary = useMemo(() => {
    const convertedAccounts =
      accountMetrics.filter(
        (metric) =>
          metric.convertedBalance !== null &&
          metric.convertedAnnualInterest !==
            null,
      );

    const totalCash =
      convertedAccounts.reduce(
        (total, metric) =>
          total +
          (metric.convertedBalance ?? 0),
        0,
      );

    const annualInterest =
      convertedAccounts.reduce(
        (total, metric) =>
          total +
          (metric.convertedAnnualInterest ??
            0),
        0,
      );

    const weightedYield =
      totalCash > 0
        ? (annualInterest / totalCash) *
          100
        : 0;

    return {
      totalCash,
      annualInterest,
      monthlyInterest:
        annualInterest / 12,
      weightedYield,
      missingRates:
        accounts.length -
        convertedAccounts.length,
    };
  }, [accountMetrics, accounts.length]);

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }

    const timestamp = fxUpdatedAt
      ? new Date(fxUpdatedAt).getTime()
      : Number.NaN;

    const ratesAreStale =
      !Number.isFinite(timestamp) ||
      Date.now() - timestamp >=
        FX_STALE_TIME_MS;

    const baseChanged =
      fxBaseCurrency !== baseCurrency;

    if (
      (ratesAreStale || baseChanged) &&
      fxSyncStatus !== "loading"
    ) {
      void refreshFxRates(baseCurrency);
    }
  }, [
    accounts.length,
    baseCurrency,
    fxBaseCurrency,
    fxSyncStatus,
    fxUpdatedAt,
    refreshFxRates,
  ]);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    const parsedBalance = Number(balance);

    const parsedYield =
      Number(annualYield);

    if (!name.trim()) {
      setFormError(
        "Account name is required.",
      );

      return;
    }

    if (
      !Number.isFinite(parsedBalance) ||
      parsedBalance <= 0
    ) {
      setFormError(
        "Balance must be greater than zero.",
      );

      return;
    }

    if (
      !Number.isFinite(parsedYield) ||
      parsedYield < 0 ||
      parsedYield > 100
    ) {
      setFormError(
        "Annual yield must be between 0% and 100%.",
      );

      return;
    }

    const input = {
      name,
      institution,
      currency,
      balance: parsedBalance,
      annualYield: parsedYield,
    };

    const result = editingId
      ? updateAccount(editingId, input)
      : addAccount(input);

    if (!result.success) {
      setFormError(
        result.error ??
          "Unable to save the account.",
      );

      return;
    }

    setSuccessMessage(
      editingId
        ? "Cash account updated."
        : "Cash account added.",
    );

    resetForm();

    window.setTimeout(() => {
      void refreshFxRates(baseCurrency);
    }, 0);
  };

  const handleEdit = (
    account: CashAccount,
  ) => {
    setEditingId(account.id);
    setName(account.name);

    setInstitution(
      account.institution ?? "",
    );

    setCurrency(account.currency);
    setBalance(String(account.balance));

    setAnnualYield(
      String(account.annualYield),
    );

    setFormError("");
    setSuccessMessage("");
  };

  const handleDelete = (
    account: CashAccount,
  ) => {
    const confirmed = window.confirm(
      `Delete ${account.name}?`,
    );

    if (!confirmed) {
      return;
    }

    removeAccount(account.id);

    if (editingId === account.id) {
      resetForm();
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Multicurrency liquidity
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Cash accounts
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Track cash balances, annual yield
            and their equivalent in{" "}
            {baseCurrency}.
          </p>
        </div>

        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() =>
              void refreshFxRates(
                baseCurrency,
              )
            }
            disabled={
              accounts.length === 0 ||
              isFxLoading
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className={`h-4 w-4 ${
                isFxLoading
                  ? "animate-spin"
                  : ""
              }`}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 11a8 8 0 0 0-14.9-4M4 4v5h5"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 13a8 8 0 0 0 14.9 4M20 20v-5h-5"
              />
            </svg>

            {isFxLoading
              ? "Updating FX..."
              : "Refresh FX rates"}
          </button>

          <p className="text-xs text-slate-400">
            {fxUpdatedAt
              ? `Updated ${dateTimeFormatter.format(
                  new Date(fxUpdatedAt),
                )}`
              : "Exchange rates not updated yet"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Total cash
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatCurrency(
              summary.totalCash,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Converted to {baseCurrency}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Annual interest
          </p>

          <p className="mt-2 text-xl font-bold text-emerald-600">
            {formatCurrency(
              summary.annualInterest,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Estimated before taxes
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Monthly average
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {formatCurrency(
              summary.monthlyInterest,
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Annual interest divided by 12
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">
            Weighted cash yield
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {percentageFormatter.format(
              summary.weightedYield,
            )}
            %
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Weighted by converted balance
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
              {editingId
                ? "Edit cash account"
                : "Add cash account"}
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Enter the current balance and
              effective annual yield.
            </p>
          </div>

          <div>
            <label
              htmlFor="cash-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Account name
            </label>

            <input
              id="cash-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Emergency fund"
              maxLength={60}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="cash-institution"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Bank or institution
            </label>

            <input
              id="cash-institution"
              type="text"
              value={institution}
              onChange={(event) =>
                setInstitution(
                  event.target.value,
                )
              }
              placeholder="BCP, Interbank, Tyba..."
              maxLength={60}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="cash-currency"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Currency
            </label>

            <select
              id="cash-currency"
              value={currency}
              onChange={(event) =>
                setCurrency(
                  event.target
                    .value as CurrencyCode,
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              {supportedCurrencies.map(
                (currencyCode) => (
                  <option
                    key={currencyCode}
                    value={currencyCode}
                  >
                    {currencyCode} —{" "}
                    {
                      currencyNames[
                        currencyCode
                      ]
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="cash-balance"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Current balance
            </label>

            <input
              id="cash-balance"
              type="number"
              value={balance}
              onChange={(event) =>
                setBalance(
                  event.target.value,
                )
              }
              placeholder="10000"
              min="0"
              step="any"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="cash-yield"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Annual yield
            </label>

            <div className="relative">
              <input
                id="cash-yield"
                type="number"
                value={annualYield}
                onChange={(event) =>
                  setAnnualYield(
                    event.target.value,
                  )
                }
                placeholder="4.5"
                min="0"
                max="100"
                step="any"
                className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-10 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />

              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                %
              </span>
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              {successMessage}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {editingId
                ? "Save changes"
                : "Add account"}
            </button>
          </div>
        </form>

        <div className="min-w-0">
          {accounts.length === 0 ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <div>
                <h3 className="font-semibold text-slate-900">
                  No cash accounts yet
                </h3>

                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Add your first bank account,
                  deposit or available cash
                  balance.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1050px] divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Account
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Balance
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Annual yield
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Annual interest
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      FX rate
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Value in {baseCurrency}
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {accountMetrics.map(
                    ({
                      account,
                      rate,
                      convertedBalance,
                      annualInterestOriginal,
                    }) => (
                      <tr
                        key={account.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">
                            {account.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {account.institution ??
                              "No institution"}{" "}
                            · {account.currency}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-slate-900">
                          {formatCurrencyFor(
                            account.balance,
                            account.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-700">
                          {percentageFormatter.format(
                            account.annualYield,
                          )}
                          %
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-emerald-600">
                          {formatCurrencyFor(
                            annualInterestOriginal,
                            account.currency,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-500">
                          {rate === null
                            ? "Pending"
                            : `1 ${account.currency} = ${rate.toFixed(
                                6,
                              )} ${baseCurrency}`}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-slate-900">
                          {convertedBalance ===
                          null
                            ? "Rate pending"
                            : formatCurrency(
                                convertedBalance,
                              )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  account,
                                )
                              }
                              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  account,
                                )
                              }
                              className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {fxSyncError && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700"
            >
              {fxSyncError}
            </div>
          )}

          {summary.missingRates > 0 && (
            <p className="mt-3 text-xs text-amber-600">
              {summary.missingRates} cash{" "}
              {summary.missingRates === 1
                ? "account is"
                : "accounts are"}{" "}
              waiting for a valid exchange
              rate.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default CashManager;