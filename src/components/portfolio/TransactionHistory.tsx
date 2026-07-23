import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore, {
  type Transaction,
  type TransactionType,
} from "../../store/portfolioStore";

type TransactionHistoryProps = {
  searchTerm?: string;
};

const sharesFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

const dateFormatter = new Intl.DateTimeFormat(
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
  const transactions = usePortfolioStore(
    (state) => state.transactions,
  );

  const { formatCurrency, formatSignedCurrency } =
    useCurrencyFormatter();

  const filteredTransactions = useMemo(() => {
    const normalizedSearchTerm = searchTerm
      .trim()
      .toUpperCase();

    const matchingTransactions =
      normalizedSearchTerm.length > 0
        ? transactions.filter((transaction) =>
            transaction.symbol.includes(
              normalizedSearchTerm,
            ),
          )
        : transactions;

    return [...matchingTransactions].sort(
      (firstTransaction, secondTransaction) =>
        new Date(secondTransaction.date).getTime() -
        new Date(firstTransaction.date).getTime(),
    );
  }, [transactions, searchTerm]);

  const renderRealizedGainLoss = (
    transaction: Transaction,
  ) => {
    if (
      transaction.type !== "sell" ||
      transaction.realizedGainLoss === undefined
    ) {
      return (
        <span className="text-sm text-slate-400">
          —
        </span>
      );
    }

    const isPositive =
      transaction.realizedGainLoss > 0;

    const isNegative =
      transaction.realizedGainLoss < 0;

    const className = isPositive
      ? "text-emerald-600"
      : isNegative
        ? "text-red-600"
        : "text-slate-600";

    return (
      <span
        className={`text-sm font-semibold ${className}`}
      >
        {formatSignedCurrency(
          transaction.realizedGainLoss,
        )}
      </span>
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">
          Transaction history
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Amounts invested, amounts sold and calculated
          fractional shares.
        </p>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <h3 className="font-semibold text-slate-900">
            No transactions found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Record a purchase or sale to begin your
            history.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Symbol
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Price
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Calculated shares
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Realized gain
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Note
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTransactions.map(
                (transaction) => (
                  <tr
                    key={transaction.id}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      {dateFormatter.format(
                        new Date(transaction.date),
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
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

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="font-semibold text-slate-900">
                        {transaction.symbol}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                      {formatCurrency(transaction.amount)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                      {formatCurrency(transaction.price)}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right text-sm text-slate-700">
                      {sharesFormatter.format(
                        transaction.shares,
                      )}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      {renderRealizedGainLoss(
                        transaction,
                      )}
                    </td>

                    <td className="max-w-64 px-5 py-4 text-sm text-slate-500">
                      <p className="truncate">
                        {transaction.note ?? "—"}
                      </p>
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