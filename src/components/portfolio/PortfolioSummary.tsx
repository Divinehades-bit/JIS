import { useMemo, type ReactNode } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import usePortfolioStore from "../../store/portfolioStore";

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  valueClassName?: string;
  icon: ReactNode;
};

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SummaryCard = ({
  label,
  value,
  description,
  valueClassName = "text-slate-900",
  icon,
}: SummaryCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-bold tracking-tight ${valueClassName}`}
          >
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>
    </article>
  );
};

const PortfolioSummary = () => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const { formatCurrency, formatSignedCurrency } =
    useCurrencyFormatter();

  const summary = useMemo(() => {
    const totalInvested = positions.reduce(
      (total, position) =>
        total + position.shares * position.averageCost,
      0,
    );

    const currentValue = positions.reduce(
      (total, position) =>
        total + position.shares * position.price,
      0,
    );

    const totalGainLoss = currentValue - totalInvested;

    const totalReturn =
      totalInvested > 0
        ? (totalGainLoss / totalInvested) * 100
        : 0;

    return {
      totalInvested,
      currentValue,
      totalGainLoss,
      totalReturn,
    };
  }, [positions]);

  const isPositive = summary.totalGainLoss > 0;
  const isNegative = summary.totalGainLoss < 0;

  const performanceClassName = isPositive
    ? "text-emerald-600"
    : isNegative
      ? "text-red-600"
      : "text-slate-900";

  const returnPrefix =
    summary.totalReturn > 0 ? "+" : "";

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        label="Invested capital"
        value={formatCurrency(summary.totalInvested)}
        description="Total amount originally invested."
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
              d="M12 6v12m4-9.5C16 7.12 14.21 6 12 6S8 7.12 8 8.5 9.79 11 12 11s4 1.12 4 2.5S14.21 16 12 16s-4-1.12-4-2.5"
            />
          </svg>
        }
      />

      <SummaryCard
        label="Current value"
        value={formatCurrency(summary.currentValue)}
        description="Current market value of all positions."
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

      <SummaryCard
        label="Total gain / loss"
        value={formatSignedCurrency(
          summary.totalGainLoss,
        )}
        valueClassName={performanceClassName}
        description="Difference between current value and cost."
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

      <SummaryCard
        label="Total return"
        value={`${returnPrefix}${percentageFormatter.format(
          summary.totalReturn,
        )}%`}
        valueClassName={performanceClassName}
        description={`${positions.length} ${
          positions.length === 1
            ? "position"
            : "positions"
        } in your portfolio.`}
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
              d="M7 17 17 7M7 7h.01M17 17h.01"
            />

            <circle cx="7" cy="7" r="2" />

            <circle cx="17" cy="17" r="2" />
          </svg>
        }
      />
    </section>
  );
};

export default PortfolioSummary;