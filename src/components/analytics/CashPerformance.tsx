import { useMemo } from "react";
import useCashStore from "../../store/cashStore";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useSettingsStore from "../../store/settingsStore";

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const CashPerformance = () => {
  const accounts = useCashStore(
    (state) => state.accounts,
  );

  const fxRates = useCashStore(
    (state) => state.fxRates,
  );

  const fxBaseCurrency = useCashStore(
    (state) => state.fxBaseCurrency,
  );

  const baseCurrency = useSettingsStore(
    (state) => state.settings.currency,
  );

  const {
    formatCurrency,
    formatCurrencyFor,
  } = useCurrencyFormatter();

  const metrics = useMemo(() => {
    return accounts
      .map((account) => {
        const rate =
          account.currency === baseCurrency
            ? 1
            : fxBaseCurrency === baseCurrency
              ? fxRates[account.currency] ??
                null
              : null;

        const annualIncomeOriginal =
          account.balance *
          (account.annualYield / 100);

        const annualIncomeConverted =
          rate !== null &&
          Number.isFinite(rate) &&
          rate > 0
            ? annualIncomeOriginal * rate
            : null;

        const convertedBalance =
          rate !== null &&
          Number.isFinite(rate) &&
          rate > 0
            ? account.balance * rate
            : null;

        return {
          account,
          annualIncomeOriginal,
          annualIncomeConverted,
          convertedBalance,
        };
      })
      .sort(
        (first, second) =>
          second.account.annualYield -
          first.account.annualYield,
      );
  }, [
    accounts,
    baseCurrency,
    fxBaseCurrency,
    fxRates,
  ]);

  if (accounts.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="font-semibold text-slate-900">
          No cash performance yet
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Add a cash account to compare yields.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Cash performance
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Compare balances, annual yields and
          expected income by account.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[850px] w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Account
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Balance
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Yield
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Annual income
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Value in {baseCurrency}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {metrics.map(
              ({
                account,
                annualIncomeOriginal,
                convertedBalance,
              }) => (
                <tr
                  key={account.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {account.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {account.institution ??
                        "No institution"}{" "}
                      · {account.currency}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                    {formatCurrencyFor(
                      account.balance,
                      account.currency,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-emerald-600">
                    {percentageFormatter.format(
                      account.annualYield,
                    )}
                    %
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                    {formatCurrencyFor(
                      annualIncomeOriginal,
                      account.currency,
                    )}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                    {convertedBalance === null
                      ? "FX pending"
                      : formatCurrency(
                          convertedBalance,
                        )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CashPerformance;