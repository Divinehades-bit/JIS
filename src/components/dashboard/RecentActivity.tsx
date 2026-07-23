import { Link } from "react-router-dom";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore, {
  type TransactionType,
} from "../../store/portfolioStore";

const sharesFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const dateFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    month: "short",
    day: "numeric",
    year: "numeric",
  },
);

const transactionLabels: Record<
  TransactionType,
  string
> = {
  opening: "Opening position",
  buy: "Purchase",
  sell: "Sale",
};

const getBadgeClassName = (
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

const RecentActivity = () => {
  const transactions = usePortfolioStore(
    (state) => state.transactions,
  );

  const { formatCurrency } = useCurrencyFormatter();

  const recentTransactions = [...transactions]
    .sort(
      (firstTransaction, secondTransaction) =>
        new Date(secondTransaction.date).getTime() -
        new Date(firstTransaction.date).getTime(),
    )
    .slice(0, 5);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Recent activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest recorded portfolio transactions.
          </p>
        </div>

        <Link
          to="/portfolio"
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          View history
        </Link>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <h3 className="font-semibold text-slate-900">
            No recent activity
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Your purchases and sales will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {recentTransactions.map(
            (transaction) => (
              <article
                key={transaction.id}
                className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white">
                  {transaction.symbol
                    .slice(0, 3)
                    .toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">
                      {transaction.symbol}
                    </p>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getBadgeClassName(
                        transaction.type,
                      )}`}
                    >
                      {
                        transactionLabels[
                          transaction.type
                        ]
                      }
                    </span>
                  </div>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {sharesFormatter.format(
                      transaction.shares,
                    )}{" "}
                    shares at{" "}
                    {formatCurrency(transaction.price)}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(transaction.amount)}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {dateFormatter.format(
                      new Date(transaction.date),
                    )}
                  </p>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
};

export default RecentActivity;