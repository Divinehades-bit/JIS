import {
  useMemo,
  type ReactNode,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useCashStore from "../../store/cashStore";
import usePortfolioStore from "../../store/portfolioStore";

type SummaryCardProps = {
  label: string;
  value: string;
  description: string;
  valueClassName?: string;
  icon: ReactNode;
};

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
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
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p
            className={`mt-3 break-words text-[clamp(1.35rem,2vw,1.75rem)] font-bold tracking-tight tabular-nums ${valueClassName}`}
          >
            {value}
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-400">
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

const PortfolioSummary = () => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const cashAccounts = useCashStore(
    (state) => state.accounts,
  );

  const { formatCurrencyFor } =
    useCurrencyFormatter();

  const summary = useMemo(() => {
    const totalInvested =
      positions.reduce(
        (total, position) =>
          total +
          position.shares *
            position.averageCost,
        0,
      );

    const currentValue =
      positions.reduce(
        (total, position) =>
          total +
          position.shares *
            position.price,
        0,
      );

    const totalGainLoss =
      currentValue - totalInvested;

    const totalReturn =
      totalInvested > 0
        ? (totalGainLoss /
            totalInvested) *
          100
        : 0;

    const usdCash =
      cashAccounts
        .filter(
          (account) =>
            account.currency ===
            "USD",
        )
        .reduce(
          (total, account) =>
            total + account.balance,
          0,
        );

    const investableAssets =
      currentValue + usdCash;

    return {
      totalInvested,
      currentValue,
      totalGainLoss,
      totalReturn,
      usdCash,
      investableAssets,
    };
  }, [positions, cashAccounts]);

  const performanceClassName =
    summary.totalGainLoss > 0
      ? "text-emerald-600"
      : summary.totalGainLoss < 0
        ? "text-red-600"
        : "text-slate-900";

  const returnClassName =
    summary.totalReturn > 0
      ? "text-emerald-600"
      : summary.totalReturn < 0
        ? "text-red-600"
        : "text-slate-900";

  const returnPrefix =
    summary.totalReturn > 0
      ? "+"
      : "";

  const gainPrefix =
    summary.totalGainLoss > 0
      ? "+"
      : "";

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        label="Invested capital"
        value={formatCurrencyFor(
          summary.totalInvested,
          "USD",
        )}
        description="Cost basis of your current investment positions."
        icon={
          <span className="text-sm font-bold">
            $
          </span>
        }
      />

      <SummaryCard
        label="Investment value"
        value={formatCurrencyFor(
          summary.currentValue,
          "USD",
        )}
        description="Current market value of your securities."
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
              d="M5 19V9m5 10V5m5 14v-7m4 7V3"
            />
          </svg>
        }
      />

      <SummaryCard
        label="USD cash"
        value={formatCurrencyFor(
          summary.usdCash,
          "USD",
        )}
        description="Available USD cash, including proceeds from investment sales."
        valueClassName={
          summary.usdCash > 0
            ? "text-blue-600"
            : "text-slate-900"
        }
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
        label="Investable assets"
        value={formatCurrencyFor(
          summary.investableAssets,
          "USD",
        )}
        description="Investment market value plus your available USD cash."
        valueClassName="text-blue-700"
        icon={
          <span className="text-lg font-bold">
            Σ
          </span>
        }
      />

      <SummaryCard
        label="Unrealized gain / loss"
        value={`${gainPrefix}${formatCurrencyFor(
          summary.totalGainLoss,
          "USD",
        )}`}
        description="Gain or loss still held inside your current positions."
        valueClassName={
          performanceClassName
        }
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
        label="Unrealized return"
        value={`${returnPrefix}${percentageFormatter.format(
          summary.totalReturn,
        )}%`}
        description={`${positions.length} positions currently held.`}
        valueClassName={
          returnClassName
        }
        icon={
          <span className="text-sm font-bold">
            %
          </span>
        }
      />
    </section>
  );
};

export default PortfolioSummary;