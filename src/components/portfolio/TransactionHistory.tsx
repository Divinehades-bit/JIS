import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useCashStore from "../../store/cashStore";
import usePortfolioStore, {
  type Transaction,
  type TransactionType,
} from "../../store/portfolioStore";

type TransactionHistoryProps = {
  searchTerm?: string;
};

const sharesFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
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

const transactionLabels: Record<
  TransactionType,
  string
> = {
  opening: "Opening",
  buy: "Buy",
  sell: "Sell",
};

const getTransactionBadgeClassName = (
  type: TransactionType,
) => {
  if (type === "buy") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (type === "sell") {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
};

const TransactionHistory = ({
  searchTerm = "",
}: TransactionHistoryProps) => {
  const transactions =
    usePortfolioStore(
      (state) =>
        state.transactions,
    );

  const reconcileSellCash =
    usePortfolioStore(
      (state) =>
        state.reconcileSellCash,
    );

  const cashAccounts =
    useCashStore(
      (state) =>
        state.accounts,
    );

  const {
    formatCurrencyFor,
  } = useCurrencyFormatter();

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

  const filteredTransactions =
    useMemo(() => {
      const normalizedSearchTerm =
        searchTerm
          .trim()
          .toUpperCase();

      const matchingTransactions =
        normalizedSearchTerm.length >
        0
          ? transactions.filter(
              (transaction) =>
                transaction.symbol.includes(
                  normalizedSearchTerm,
                ),
            )
          : transactions;

      return [
        ...matchingTransactions,
      ].sort(
        (
          firstTransaction,
          secondTransaction,
        ) =>
          new Date(
            secondTransaction.date,
          ).getTime() -
          new Date(
            firstTransaction.date,
          ).getTime(),
      );
    }, [
      transactions,
      searchTerm,
    ]);

  const getCashAccountName = (
    transaction: Transaction,
  ) => {
    if (
      transaction.cashAccountName
    ) {
      return transaction.cashAccountName;
    }

    if (
      !transaction.cashAccountId
    ) {
      return null;
    }

    const account =
      cashAccounts.find(
        (item) =>
          item.id ===
          transaction.cashAccountId,
      );

    return account?.name ?? null;
  };

  const handleReconcile = (
    transaction: Transaction,
    cashAccountId: string,
  ) => {
    if (!cashAccountId) {
      return;
    }

    const cashAccount =
      usdCashAccounts.find(
        (account) =>
          account.id ===
          cashAccountId,
      );

    if (!cashAccount) {
      window.alert(
        "Cash account not found.",
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Deposit ${formatCurrencyFor(
          transaction.amount,
          "USD",
        )} from the ${transaction.symbol} sale into ${cashAccount.name}?\n\nThis will increase the cash account balance by the full sale proceeds.`,
      );

    if (!confirmed) {
      return;
    }

    const result =
      reconcileSellCash(
        transaction.id,
        cashAccount.id,
      );

    if (!result.success) {
      window.alert(
        result.error ??
          "Unable to reconcile the sale.",
      );
    }
  };

  const renderCashMovement = (
    transaction: Transaction,
  ) => {
    if (
      transaction.type ===
      "opening"
    ) {
      return (
        <span className="text-slate-400">
          —
        </span>
      );
    }

    const cashAccountName =
      getCashAccountName(
        transaction,
      );

    if (
      transaction.type ===
        "buy" &&
      !cashAccountName
    ) {
      return (
        <div>
          <p className="text-sm font-medium text-blue-600">
            External contribution
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            New money
          </p>
        </div>
      );
    }

    if (
      transaction.type ===
        "sell" &&
      !cashAccountName
    ) {
      if (
        usdCashAccounts.length ===
        0
      ) {
        return (
          <div>
            <p className="text-xs font-semibold text-amber-600">
              Unassigned sale
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Create a USD cash account
            </p>
          </div>
        );
      }

      return (
        <div className="min-w-44">
          <p className="mb-1.5 text-xs font-semibold text-amber-600">
            Unassigned sale
          </p>

          <select
            value=""
            onChange={(event) =>
              handleReconcile(
                transaction,
                event.target.value,
              )
            }
            className="w-full rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-medium text-slate-700 outline-none transition focus:border-amber-400"
          >
            <option value="">
              Move proceeds to...
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
                  {account.name}
                </option>
              ),
            )}
          </select>
        </div>
      );
    }

    if (!cashAccountName) {
      return (
        <span className="text-slate-400">
          —
        </span>
      );
    }

    if (
      transaction.type ===
      "sell"
    ) {
      return (
        <div>
          <p className="text-sm font-semibold text-emerald-600">
            +
            {formatCurrencyFor(
              transaction.amount,
              "USD",
            )}
          </p>

          <p className="mt-0.5 text-xs font-medium text-slate-500">
            → {cashAccountName}
          </p>
        </div>
      );
    }

    return (
      <div>
        <p className="text-sm font-semibold text-red-600">
          −
          {formatCurrencyFor(
            transaction.amount,
            "USD",
          )}
        </p>

        <p className="mt-0.5 text-xs font-medium text-slate-500">
          ← {cashAccountName}
        </p>
      </div>
    );
  };

  const renderRealizedGainLoss = (
    transaction: Transaction,
  ) => {
    if (
      transaction.type !==
        "sell" ||
      transaction.realizedGainLoss ===
        undefined
    ) {
      return (
        <span className="text-slate-400">
          —
        </span>
      );
    }

    const gain =
      transaction.realizedGainLoss;

    const className =
      gain > 0
        ? "text-emerald-600"
        : gain < 0
          ? "text-red-600"
          : "text-slate-600";

    const prefix =
      gain > 0 ? "+" : "";

    return (
      <span
        className={`font-semibold ${className}`}
      >
        {prefix}
        {formatCurrencyFor(
          gain,
          "USD",
        )}
      </span>
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Transaction history
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Purchases, sales and the
          cash account used for every
          investment movement.
        </p>
      </div>

      {filteredTransactions.length ===
      0 ? (
        <div className="flex min-h-56 items-center justify-center p-8 text-center">
          <div>
            <h3 className="font-semibold text-slate-900">
              No transactions found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Record a purchase or
              sale to begin your
              history.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1220px] w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Type
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Symbol
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Price
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Calculated shares
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cash movement
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Realized gain
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Note
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map(
                (transaction) => (
                  <tr
                    key={
                      transaction.id
                    }
                    className="transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {dateFormatter.format(
                        new Date(
                          transaction.date,
                        ),
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getTransactionBadgeClassName(
                          transaction.type,
                        )}`}
                      >
                        {
                          transactionLabels[
                            transaction.type
                          ]
                        }
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      {
                        transaction.symbol
                      }
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrencyFor(
                        transaction.amount,
                        "USD",
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600">
                      {formatCurrencyFor(
                        transaction.price,
                        "USD",
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-600">
                      {sharesFormatter.format(
                        transaction.shares,
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {renderCashMovement(
                        transaction,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
                      {renderRealizedGainLoss(
                        transaction,
                      )}
                    </td>

                    <td className="max-w-56 px-5 py-4 text-sm text-slate-500">
                      {transaction.note ??
                        "—"}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TransactionHistory;