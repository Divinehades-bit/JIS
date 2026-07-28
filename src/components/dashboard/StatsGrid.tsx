import type { ReactNode } from "react";
import useContributionSummary from "../../hooks/useContributionSummary";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useWealthSummary from "../../hooks/useWealthSummary";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  valueClassName?: string;
};

const BALANCE_TOLERANCE =
  0.00000001;

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
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
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>

      <p
        title={value}
        className={`mt-4 break-words text-[clamp(1.3rem,2vw,1.75rem)] font-bold leading-tight tracking-tight tabular-nums ${valueClassName}`}
      >
        {value}
      </p>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </article>
  );
};

const StatsGrid = () => {
  const {
    formatCurrency,
    formatSignedCurrency,
  } = useCurrencyFormatter();

  const wealth =
    useWealthSummary();

  const contributions =
    useContributionSummary();

  const formatOptionalCurrency = (
    value: number | null,
  ) => {
    return value === null
      ? "FX pending"
      : formatCurrency(value);
  };

  const netContributions =
    Math.abs(
      contributions.netContributions,
    ) <= BALANCE_TOLERANCE
      ? 0
      : contributions.netContributions;

  const contributionValue =
    contributions.missingFx
      ? "FX pending"
      : netContributions === 0
        ? formatCurrency(0)
        : formatSignedCurrency(
            netContributions,
          );

  const contributionClassName =
    contributions.missingFx ||
    netContributions === 0
      ? "text-slate-900"
      : netContributions > 0
        ? "text-blue-600"
        : "text-red-600";

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title="Net worth"
        value={formatOptionalCurrency(
          wealth.netWorth,
        )}
        description="Your complete JIS wealth: investments plus cash."
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16v13H4zM4 10h16M16 14h2"
            />
          </svg>
        }
      />

      <StatCard
        title="Investments"
        value={formatOptionalCurrency(
          wealth.investmentCurrentValue,
        )}
        description={`${wealth.positionCount} positions currently held.`}
        icon={
          <svg
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
        title="Cash"
        value={formatCurrency(
          wealth.totalCash,
        )}
        description={`${percentageFormatter.format(
          wealth.cashAllocation,
        )}% of net worth · ${formatCurrency(
          wealth.annualCashIncome,
        )}/year estimated income.`}
        icon={
          <svg
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

            <circle
              cx="12"
              cy="12.5"
              r="2.5"
            />
          </svg>
        }
      />

      <StatCard
        title="Net contributions"
        value={contributionValue}
        valueClassName={
          contributionClassName
        }
        description="External deposits minus withdrawals. Opening balances are excluded."
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v18M7 8l5-5 5 5M7 16l5 5 5-5"
            />
          </svg>
        }
      />
    </section>
  );
};

export default StatsGrid;