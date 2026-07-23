import type { ReactNode } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useWealthSummary from "../../hooks/useWealthSummary";

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  valueClassName?: string;
};

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SummaryCard = ({
  title,
  value,
  description,
  icon,
  valueClassName = "text-slate-900",
}: SummaryCardProps) => {
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

const AnalyticsSummary = () => {
  const {
    formatCurrency,
    formatSignedCurrency,
  } = useCurrencyFormatter();

  const summary = useWealthSummary();

  const investmentPerformanceClass =
    summary.investmentGainLoss !== null &&
    summary.investmentGainLoss > 0
      ? "text-emerald-600"
      : summary.investmentGainLoss !== null &&
          summary.investmentGainLoss < 0
        ? "text-red-600"
        : "text-slate-900";

  const netWorth =
    summary.netWorth === null
      ? "FX pending"
      : formatCurrency(summary.netWorth);

  const investments =
    summary.investmentCurrentValue === null
      ? "FX pending"
      : formatCurrency(
          summary.investmentCurrentValue,
        );

  const investmentGainLoss =
    summary.investmentGainLoss === null
      ? "FX pending"
      : formatSignedCurrency(
          summary.investmentGainLoss,
        );

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        title="Net worth"
        value={netWorth}
        description="Investments plus converted cash balances."
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

      <SummaryCard
        title="Investments"
        value={investments}
        description={`${summary.positionCount} market positions currently tracked.`}
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

      <SummaryCard
        title="Cash"
        value={formatCurrency(
          summary.totalCash,
        )}
        description={`${percentageFormatter.format(
          summary.cashAllocation,
        )}% of total net worth.`}
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

      <SummaryCard
        title="Investment gain / loss"
        value={investmentGainLoss}
        valueClassName={
          investmentPerformanceClass
        }
        description={`Unrealized investment return: ${
          summary.investmentReturn > 0
            ? "+"
            : ""
        }${percentageFormatter.format(
          summary.investmentReturn,
        )}%.`}
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
        title="Cash annual income"
        value={formatCurrency(
          summary.annualCashIncome,
        )}
        valueClassName="text-emerald-600"
        description={`${formatCurrency(
          summary.monthlyCashIncome,
        )} estimated average per month.`}
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
              d="M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5S8 6.1 8 7.5 9.8 10 12 10s4 1.1 4 2.5S14.2 15 12 15s-4-1.1-4-2.5"
            />
          </svg>
        }
      />

      <SummaryCard
        title="Cash annual yield"
        value={`${percentageFormatter.format(
          summary.cashWeightedYield,
        )}%`}
        description={`Weighted return across ${summary.cashAccountCount} cash ${
          summary.cashAccountCount === 1
            ? "account"
            : "accounts"
        }.`}
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
              d="M7 17 17 7"
            />

            <circle
              cx="7"
              cy="7"
              r="2"
            />

            <circle
              cx="17"
              cy="17"
              r="2"
            />
          </svg>
        }
      />
    </section>
  );
};

export default AnalyticsSummary;