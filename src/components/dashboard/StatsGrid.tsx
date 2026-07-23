import { useMemo, type ReactNode } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  valueClassName?: string;
};

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const StatCard = ({
  title,
  value,
  description,
  icon,
  valueClassName = "text-slate-900",
}: StatCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-2 truncate text-2xl font-bold tracking-tight ${valueClassName}`}
          >
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>
    </article>
  );
};

const StatsGrid = () => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const { formatCurrency, formatSignedCurrency } =
    useCurrencyFormatter();

  const summary = useMemo(() => {
    const investedCapital = positions.reduce(
      (total, position) =>
        total + position.shares * position.averageCost,
      0,
    );

    const currentValue = positions.reduce(
      (total, position) =>
        total + position.shares * position.price,
      0,
    );

    const gainLoss = currentValue - investedCapital;

    const totalReturn =
      investedCapital > 0
        ? (gainLoss / investedCapital) * 100
        : 0;

    return {
      investedCapital,
      currentValue,
      gainLoss,
      totalReturn,
    };
  }, [positions]);

  const isPositive = summary.gainLoss > 0;
  const isNegative = summary.gainLoss < 0;

  const performanceClassName = isPositive
    ? "text-emerald-600"
    : isNegative
      ? "text-red-600"
      : "text-slate-900";

  const returnPrefix =
    summary.totalReturn > 0 ? "+" : "";

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Current value"
        value={formatCurrency(summary.currentValue)}
        description={`${positions.length} ${
          positions.length === 1
            ? "position"
            : "positions"
        } currently tracked.`}
        icon={
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 19V9m5 10V5m5 14v-7m5 7V3"
            />
          </svg>
        }
      />

      <StatCard
        title="Invested capital"
        value={formatCurrency(summary.investedCapital)}
        description="Original cost of all portfolio positions."
        icon={
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect
              x="3"
              y="6"
              width="18"
              height="13"
              rx="2"
            />

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 6V4h10v2M3 11h18"
            />
          </svg>
        }
      />

      <StatCard
        title="Total gain / loss"
        value={formatSignedCurrency(summary.gainLoss)}
        valueClassName={performanceClassName}
        description="Current value minus invested capital."
        icon={
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4 16 5-5 4 4 7-8"
            />

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 7h5v5"
            />
          </svg>
        }
      />

      <StatCard
        title="Total return"
        value={`${returnPrefix}${percentageFormatter.format(
          summary.totalReturn,
        )}%`}
        valueClassName={performanceClassName}
        description="Overall unrealized portfolio performance."
        icon={
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 17 17 7"
            />

            <circle cx="7" cy="7" r="2" />

            <circle cx="17" cy="17" r="2" />
          </svg>
        }
      />
    </section>
  );
};

export default StatsGrid;