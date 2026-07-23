import {
  useMemo,
  type ReactNode,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useGoalStore from "../../store/goalStore";
import usePortfolioStore from "../../store/portfolioStore";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
  valueClassName?: string;
};

type ProjectionCheckpoint = {
  month: number;
  date: Date;
  value: number;
};

const percentageFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    year: "numeric",
    month: "short",
    day: "numeric",
  },
);

const monthYearFormatter = new Intl.DateTimeFormat(
  "en-US",
  {
    year: "numeric",
    month: "short",
  },
);

const calculateMonthsRemaining = (
  targetDateValue: string,
) => {
  const today = new Date();

  const targetDate = new Date(
    `${targetDateValue}T12:00:00`,
  );

  if (
    Number.isNaN(targetDate.getTime()) ||
    targetDate <= today
  ) {
    return 0;
  }

  let months =
    (targetDate.getFullYear() -
      today.getFullYear()) *
      12 +
    targetDate.getMonth() -
    today.getMonth();

  if (targetDate.getDate() > today.getDate()) {
    months += 1;
  }

  return Math.max(months, 1);
};

const calculateFutureValue = (
  currentValue: number,
  monthlyContribution: number,
  monthlyReturn: number,
  months: number,
) => {
  if (months <= 0) {
    return currentValue;
  }

  if (monthlyReturn === 0) {
    return (
      currentValue +
      monthlyContribution * months
    );
  }

  const growthFactor = Math.pow(
    1 + monthlyReturn,
    months,
  );

  const currentValueGrowth =
    currentValue * growthFactor;

  const contributionGrowth =
    monthlyContribution *
    ((growthFactor - 1) / monthlyReturn);

  return currentValueGrowth + contributionGrowth;
};

const calculateRequiredContribution = (
  currentValue: number,
  targetAmount: number,
  monthlyReturn: number,
  months: number,
) => {
  if (currentValue >= targetAmount) {
    return 0;
  }

  if (months <= 0) {
    return targetAmount - currentValue;
  }

  if (monthlyReturn === 0) {
    return Math.max(
      (targetAmount - currentValue) / months,
      0,
    );
  }

  const growthFactor = Math.pow(
    1 + monthlyReturn,
    months,
  );

  const futureCurrentValue =
    currentValue * growthFactor;

  const remainingTarget =
    targetAmount - futureCurrentValue;

  if (remainingTarget <= 0) {
    return 0;
  }

  return Math.max(
    (remainingTarget * monthlyReturn) /
      (growthFactor - 1),
    0,
  );
};

const calculateEstimatedMonths = (
  currentValue: number,
  targetAmount: number,
  monthlyContribution: number,
  monthlyReturn: number,
) => {
  if (currentValue >= targetAmount) {
    return 0;
  }

  if (
    monthlyContribution <= 0 &&
    monthlyReturn <= 0
  ) {
    return null;
  }

  let projectedValue = currentValue;

  for (let month = 1; month <= 1200; month += 1) {
    projectedValue =
      projectedValue * (1 + monthlyReturn) +
      monthlyContribution;

    if (projectedValue >= targetAmount) {
      return month;
    }
  }

  return null;
};

const addMonths = (
  date: Date,
  months: number,
) => {
  const nextDate = new Date(date);

  nextDate.setMonth(
    nextDate.getMonth() + months,
  );

  return nextDate;
};

const MetricCard = ({
  label,
  value,
  description,
  icon,
  valueClassName = "text-slate-900",
}: MetricCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {label}
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

const GoalOverview = () => {
  const goal = useGoalStore(
    (state) => state.goal,
  );

  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const { formatCurrency } =
    useCurrencyFormatter();

  const analytics = useMemo(() => {
    if (!goal) {
      return null;
    }

    const currentValue = positions.reduce(
      (total, position) =>
        total + position.shares * position.price,
      0,
    );

    const monthsRemaining =
      calculateMonthsRemaining(goal.targetDate);

    const monthlyReturn =
      goal.annualReturn / 100 / 12;

    const projectedValue = calculateFutureValue(
      currentValue,
      goal.monthlyContribution,
      monthlyReturn,
      monthsRemaining,
    );

    const requiredMonthlyContribution =
      calculateRequiredContribution(
        currentValue,
        goal.targetAmount,
        monthlyReturn,
        monthsRemaining,
      );

    const estimatedMonths =
      calculateEstimatedMonths(
        currentValue,
        goal.targetAmount,
        goal.monthlyContribution,
        monthlyReturn,
      );

    const currentProgress =
      goal.targetAmount > 0
        ? (currentValue / goal.targetAmount) * 100
        : 0;

    const projectedProgress =
      goal.targetAmount > 0
        ? (projectedValue / goal.targetAmount) *
          100
        : 0;

    const monthlyContributionGap = Math.max(
      requiredMonthlyContribution -
        goal.monthlyContribution,
      0,
    );

    const isGoalReached =
      currentValue >= goal.targetAmount;

    const isOnTrack =
      isGoalReached ||
      projectedValue >= goal.targetAmount;

    const checkpointMonths = Array.from(
      new Set([
        0,
        Math.round(monthsRemaining * 0.25),
        Math.round(monthsRemaining * 0.5),
        Math.round(monthsRemaining * 0.75),
        monthsRemaining,
      ]),
    ).sort(
      (firstMonth, secondMonth) =>
        firstMonth - secondMonth,
    );

    const today = new Date();

    const checkpoints: ProjectionCheckpoint[] =
      checkpointMonths.map((month) => ({
        month,
        date: addMonths(today, month),
        value: calculateFutureValue(
          currentValue,
          goal.monthlyContribution,
          monthlyReturn,
          month,
        ),
      }));

    const estimatedCompletionDate =
      estimatedMonths === null
        ? null
        : addMonths(today, estimatedMonths);

    return {
      currentValue,
      monthsRemaining,
      projectedValue,
      requiredMonthlyContribution,
      estimatedCompletionDate,
      currentProgress,
      projectedProgress,
      monthlyContributionGap,
      isGoalReached,
      isOnTrack,
      checkpoints,
    };
  }, [goal, positions]);

  if (!goal || !analytics) {
    return (
      <section className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <div className="max-w-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-500">
            $
          </div>

          <h2 className="mt-5 text-xl font-semibold text-slate-900">
            No financial goal yet
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Create a goal to calculate your required
            monthly contribution and projected portfolio
            value.
          </p>
        </div>
      </section>
    );
  }

  const statusLabel = analytics.isGoalReached
    ? "Goal reached"
    : analytics.isOnTrack
      ? "On track"
      : "Needs adjustment";

  const statusClassName = analytics.isGoalReached
    ? "bg-blue-50 text-blue-700"
    : analytics.isOnTrack
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  const projectionClassName =
    analytics.projectedValue >= goal.targetAmount
      ? "text-emerald-600"
      : "text-amber-600";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Financial goal
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(goal.targetAmount)}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Target date:{" "}
              {dateFormatter.format(
                new Date(
                  `${goal.targetDate}T12:00:00`,
                ),
              )}
            </p>
          </div>

          <span
            className={`self-start rounded-full px-3 py-1.5 text-sm font-semibold ${statusClassName}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-slate-600">
              Current progress
            </span>

            <span className="text-sm font-semibold text-slate-900">
              {percentageFormatter.format(
                analytics.currentProgress,
              )}
              %
            </span>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{
                width: `${Math.min(
                  Math.max(
                    analytics.currentProgress,
                    0,
                  ),
                  100,
                )}%`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:justify-between">
            <span>
              Current:{" "}
              {formatCurrency(
                analytics.currentValue,
              )}
            </span>

            <span>
              Remaining:{" "}
              {formatCurrency(
                Math.max(
                  goal.targetAmount -
                    analytics.currentValue,
                  0,
                ),
              )}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Current portfolio"
          value={formatCurrency(
            analytics.currentValue,
          )}
          description="Current market value from Zustand."
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

        <MetricCard
          label="Projected value"
          value={formatCurrency(
            analytics.projectedValue,
          )}
          valueClassName={projectionClassName}
          description={`${percentageFormatter.format(
            analytics.projectedProgress,
          )}% of the target by the selected date.`}
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

        <MetricCard
          label="Required monthly"
          value={formatCurrency(
            analytics.requiredMonthlyContribution,
          )}
          description="Estimated contribution needed to reach the goal."
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
                d="M12 3v18M7 7h7.5a3.5 3.5 0 0 1 0 7H9.5a3.5 3.5 0 0 0 0 7H17"
              />
            </svg>
          }
        />

        <MetricCard
          label="Time remaining"
          value={`${analytics.monthsRemaining} months`}
          description={`${goal.annualReturn.toFixed(
            2,
          )}% expected annual return.`}
          icon={
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 7v5l3 2"
              />
            </svg>
          }
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Monthly plan
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Compare your planned contribution with the
            estimated requirement.
          </p>

          <div className="mt-6 divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm text-slate-500">
                Planned contribution
              </span>

              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  goal.monthlyContribution,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm text-slate-500">
                Required contribution
              </span>

              <span className="font-semibold text-slate-900">
                {formatCurrency(
                  analytics.requiredMonthlyContribution,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm text-slate-500">
                Additional amount needed
              </span>

              <span
                className={`font-semibold ${
                  analytics.monthlyContributionGap > 0
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              >
                {formatCurrency(
                  analytics.monthlyContributionGap,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-4">
              <span className="text-sm text-slate-500">
                Estimated completion
              </span>

              <span className="text-right font-semibold text-slate-900">
                {analytics.estimatedCompletionDate
                  ? monthYearFormatter.format(
                      analytics.estimatedCompletionDate,
                    )
                  : "Not reached"}
              </span>
            </div>
          </div>

          <div
            className={`mt-5 rounded-xl px-4 py-3 text-sm ${
              analytics.isOnTrack
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {analytics.isGoalReached
              ? "Your current portfolio already meets this goal."
              : analytics.isOnTrack
                ? "Your current monthly plan is projected to reach the goal."
                : `Increase the monthly contribution by approximately ${formatCurrency(
                    analytics.monthlyContributionGap,
                  )} to reach the target on time.`}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Projection checkpoints
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Estimated portfolio value throughout the
            selected period.
          </p>

          <div className="mt-6 space-y-5">
            {analytics.checkpoints.map(
              (checkpoint) => {
                const checkpointProgress =
                  goal.targetAmount > 0
                    ? (checkpoint.value /
                        goal.targetAmount) *
                      100
                    : 0;

                return (
                  <div key={checkpoint.month}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          {checkpoint.month === 0
                            ? "Today"
                            : monthYearFormatter.format(
                                checkpoint.date,
                              )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Month {checkpoint.month}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(
                            checkpoint.value,
                          )}
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          {percentageFormatter.format(
                            checkpointProgress,
                          )}
                          %
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-700"
                        style={{
                          width: `${Math.min(
                            Math.max(
                              checkpointProgress,
                              0,
                            ),
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </article>
      </section>

      <p className="px-1 text-xs leading-5 text-slate-400">
        Projections use monthly compounding and assume
        contributions are made at the end of each month.
        Actual investment returns can vary.
      </p>
    </div>
  );
};

export default GoalOverview;