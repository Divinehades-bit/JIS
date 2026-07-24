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

const getPerformanceClassName = (
  value: number | null,
) => {
  if (
    value === null ||
    value === 0
  ) {
    return "text-slate-900";
  }

  return value > 0
    ? "text-emerald-600"
    : "text-red-600";
};

const AnalyticsSummary = () => {
  const {
    formatCurrency,
    formatSignedCurrency,
  } = useCurrencyFormatter();

  const summary =
    useWealthSummary();

  const netWorth =
    summary.netWorth === null
      ? "FX pending"
      : formatCurrency(
          summary.netWorth,
        );

  const investments =
    summary.investmentCurrentValue ===
    null
      ? "FX pending"
      : formatCurrency(
          summary.investmentCurrentValue,
        );

  const totalInvestmentProfit =
    summary.totalInvestmentProfit ===
    null
      ? "FX pending"
      : formatSignedCurrency(
          summary.totalInvestmentProfit,
        );

  const netDividends =
    summary.netDividends === null
      ? "FX pending"
      : formatSignedCurrency(
          summary.netDividends,
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
        description={`${summary.positionCount} market positions currently held.`}
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
        title="Total investment profit"
        value={totalInvestmentProfit}
        valueClassName={getPerformanceClassName(
          summary.totalInvestmentProfit,
        )}
        description="Unrealized + realized + net dividend income."
        icon={
          <span className="font-bold">
            Σ
          </span>
        }
      />

      <SummaryCard
        title="Net dividends"
        value={netDividends}
        valueClassName={getPerformanceClassName(
          summary.netDividends,
        )}
        description={`${formatCurrency(
          summary.grossDividends ?? 0,
        )} gross · ${formatCurrency(
          summary.dividendTax ?? 0,
        )} withheld.`}
        icon={
          <span className="font-bold">
            D
          </span>
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
        )} estimated average per month from cash yield.`}
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
    </section>
  );
};

export default AnalyticsSummary;