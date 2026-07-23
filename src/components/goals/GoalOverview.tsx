import {
  useMemo,
  type ReactNode,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useWealthSummary from "../../hooks/useWealthSummary";
import useGoalStore from "../../store/goalStore";

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

type ReturnScenario = {
  id:
    | "conservative"
    | "base"
    | "optimistic";

  label: string;

  annualReturn: number;

  projectedValue: number;

  requiredContribution: number;

  estimatedCompletionDate:
    | Date
    | null;

  isOnTrack: boolean;
};

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const returnFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

const dateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

const monthYearFormatter =
  new Intl.DateTimeFormat(
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
    Number.isNaN(
      targetDate.getTime(),
    ) ||
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

  if (
    targetDate.getDate() >
    today.getDate()
  ) {
    months += 1;
  }

  return Math.max(months, 1);
};

const annualToMonthlyRate = (
  annualReturn: number,
) => {
  if (annualReturn <= 0) {
    return 0;
  }

  return (
    Math.pow(
      1 + annualReturn / 100,
      1 / 12,
    ) - 1
  );
};

const calculatePrincipalFutureValue = (
  currentValue: number,
  monthlyReturn: number,
  months: number,
) => {
  if (months <= 0) {
    return currentValue;
  }

  return (
    currentValue *
    Math.pow(
      1 + monthlyReturn,
      months,
    )
  );
};

const calculateContributionFutureValue = (
  monthlyContribution: number,
  monthlyReturn: number,
  months: number,
) => {
  if (
    months <= 0 ||
    monthlyContribution <= 0
  ) {
    return 0;
  }

  if (monthlyReturn === 0) {
    return (
      monthlyContribution * months
    );
  }

  const growthFactor =
    Math.pow(
      1 + monthlyReturn,
      months,
    );

  return (
    monthlyContribution *
    ((growthFactor - 1) /
      monthlyReturn)
  );
};

const calculateNetWorthFutureValue = (
  investments: number,
  cash: number,
  monthlyContribution: number,
  investmentMonthlyReturn: number,
  cashMonthlyReturn: number,
  months: number,
) => {
  const futureInvestments =
    calculatePrincipalFutureValue(
      investments,
      investmentMonthlyReturn,
      months,
    );

  const futureContributions =
    calculateContributionFutureValue(
      monthlyContribution,
      investmentMonthlyReturn,
      months,
    );

  const futureCash =
    calculatePrincipalFutureValue(
      cash,
      cashMonthlyReturn,
      months,
    );

  return (
    futureInvestments +
    futureContributions +
    futureCash
  );
};

const calculateRequiredContribution = (
  investments: number,
  cash: number,
  targetAmount: number,
  investmentMonthlyReturn: number,
  cashMonthlyReturn: number,
  months: number,
) => {
  const futureInvestments =
    calculatePrincipalFutureValue(
      investments,
      investmentMonthlyReturn,
      months,
    );

  const futureCash =
    calculatePrincipalFutureValue(
      cash,
      cashMonthlyReturn,
      months,
    );

  const remainingTarget =
    targetAmount -
    futureInvestments -
    futureCash;

  if (remainingTarget <= 0) {
    return 0;
  }

  if (months <= 0) {
    return remainingTarget;
  }

  if (
    investmentMonthlyReturn === 0
  ) {
    return Math.max(
      remainingTarget / months,
      0,
    );
  }

  const growthFactor =
    Math.pow(
      1 +
        investmentMonthlyReturn,
      months,
    );

  const contributionFactor =
    (growthFactor - 1) /
    investmentMonthlyReturn;

  if (
    contributionFactor <= 0
  ) {
    return 0;
  }

  return Math.max(
    remainingTarget /
      contributionFactor,
    0,
  );
};

const calculateEstimatedMonths = (
  investments: number,
  cash: number,
  targetAmount: number,
  monthlyContribution: number,
  investmentMonthlyReturn: number,
  cashMonthlyReturn: number,
) => {
  if (
    investments + cash >=
    targetAmount
  ) {
    return 0;
  }

  if (
    monthlyContribution <= 0 &&
    investmentMonthlyReturn <= 0 &&
    cashMonthlyReturn <= 0
  ) {
    return null;
  }

  let projectedInvestments =
    investments;

  let projectedCash = cash;

  for (
    let month = 1;
    month <= 1200;
    month += 1
  ) {
    projectedInvestments =
      projectedInvestments *
        (1 +
          investmentMonthlyReturn) +
      monthlyContribution;

    projectedCash =
      projectedCash *
      (1 + cashMonthlyReturn);

    if (
      projectedInvestments +
        projectedCash >=
      targetAmount
    ) {
      return month;
    }
  }

  return null;
};

const addMonths = (
  date: Date,
  months: number,
) => {
  const nextDate =
    new Date(date);

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
  valueClassName =
    "text-slate-900",
}: MetricCardProps) => {
  return (
    <article className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">
            {label}
          </p>

          <p
            className={`mt-2 break-words text-lg font-bold ${valueClassName}`}
          >
            {value}
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
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

  const wealth =
    useWealthSummary();

  const { formatCurrency } =
    useCurrencyFormatter();

  const analytics =
    useMemo(() => {
      if (
        !goal ||
        wealth.netWorth === null ||
        wealth.investmentCurrentValue ===
          null
      ) {
        return null;
      }

      const currentNetWorth =
        wealth.netWorth;

      const investments =
        wealth.investmentCurrentValue;

      const cash =
        wealth.totalCash;

      const monthsRemaining =
        calculateMonthsRemaining(
          goal.targetDate,
        );

      const cashMonthlyReturn =
        annualToMonthlyRate(
          wealth.cashWeightedYield,
        );

      const conservativeReturn =
        Math.max(
          goal.annualReturn - 2,
          0,
        );

      const optimisticReturn =
        Math.min(
          goal.annualReturn + 2,
          100,
        );

      const scenarioInputs = [
        {
          id: "conservative" as const,
          label: "Conservative",
          annualReturn:
            conservativeReturn,
        },

        {
          id: "base" as const,
          label: "Base",
          annualReturn:
            goal.annualReturn,
        },

        {
          id: "optimistic" as const,
          label: "Optimistic",
          annualReturn:
            optimisticReturn,
        },
      ];

      const today = new Date();

      const scenarios:
        ReturnScenario[] =
        scenarioInputs.map(
          (scenario) => {
            const investmentMonthlyReturn =
              annualToMonthlyRate(
                scenario.annualReturn,
              );

            const projectedValue =
              calculateNetWorthFutureValue(
                investments,
                cash,
                goal.monthlyContribution,
                investmentMonthlyReturn,
                cashMonthlyReturn,
                monthsRemaining,
              );

            const requiredContribution =
              calculateRequiredContribution(
                investments,
                cash,
                goal.targetAmount,
                investmentMonthlyReturn,
                cashMonthlyReturn,
                monthsRemaining,
              );

            const estimatedMonths =
              calculateEstimatedMonths(
                investments,
                cash,
                goal.targetAmount,
                goal.monthlyContribution,
                investmentMonthlyReturn,
                cashMonthlyReturn,
              );

            return {
              ...scenario,

              projectedValue,

              requiredContribution,

              estimatedCompletionDate:
                estimatedMonths ===
                null
                  ? null
                  : addMonths(
                      today,
                      estimatedMonths,
                    ),

              isOnTrack:
                projectedValue >=
                goal.targetAmount,
            };
          },
        );

      const baseScenario =
        scenarios.find(
          (scenario) =>
            scenario.id === "base",
        ) ?? scenarios[0];

      const currentProgress =
        goal.targetAmount > 0
          ? (currentNetWorth /
              goal.targetAmount) *
            100
          : 0;

      const remainingAmount =
        Math.max(
          goal.targetAmount -
            currentNetWorth,
          0,
        );

      const contributionGap =
        Math.max(
          baseScenario.requiredContribution -
            goal.monthlyContribution,
          0,
        );

      const isGoalReached =
        currentNetWorth >=
        goal.targetAmount;

      const checkpointMonths =
        Array.from(
          new Set([
            0,

            Math.round(
              monthsRemaining * 0.25,
            ),

            Math.round(
              monthsRemaining * 0.5,
            ),

            Math.round(
              monthsRemaining * 0.75,
            ),

            monthsRemaining,
          ]),
        ).sort(
          (
            firstMonth,
            secondMonth,
          ) =>
            firstMonth -
            secondMonth,
        );

      const baseMonthlyReturn =
        annualToMonthlyRate(
          goal.annualReturn,
        );

      const checkpoints:
        ProjectionCheckpoint[] =
        checkpointMonths.map(
          (month) => ({
            month,

            date: addMonths(
              today,
              month,
            ),

            value:
              calculateNetWorthFutureValue(
                investments,
                cash,
                goal.monthlyContribution,
                baseMonthlyReturn,
                cashMonthlyReturn,
                month,
              ),
          }),
        );

      return {
        currentNetWorth,
        investments,
        cash,

        monthsRemaining,

        currentProgress,
        remainingAmount,

        contributionGap,

        scenarios,

        baseScenario,

        checkpoints,

        isGoalReached,

        cashAnnualReturn:
          wealth.cashWeightedYield,
      };
    }, [
      goal,

      wealth.netWorth,

      wealth.investmentCurrentValue,

      wealth.totalCash,

      wealth.cashWeightedYield,
    ]);

  if (!goal) {
    return (
      <section className="flex min-h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl font-bold text-slate-400">
            $
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            No financial goal yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Create a goal to project
            your complete net worth,
            including investments and
            cash.
          </p>
        </div>
      </section>
    );
  }

  if (
    !wealth.hasCompleteFx ||
    !analytics
  ) {
    return (
      <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-800">
          Exchange rates required
        </h2>

        <p className="mt-2 text-sm leading-6 text-amber-700">
          JIS needs valid FX rates for
          all your cash accounts before
          calculating your financial
          goal. Go to Portfolio → Cash
          accounts and refresh FX
          rates.
        </p>
      </section>
    );
  }

  const progressWidth =
    Math.min(
      Math.max(
        analytics.currentProgress,
        0,
      ),
      100,
    );

  const baseStatus =
    analytics.isGoalReached
      ? "Goal reached"
      : analytics.baseScenario
            .isOnTrack
        ? "On track"
        : "Needs adjustment";

  const statusClassName =
    analytics.isGoalReached
      ? "bg-blue-50 text-blue-700"
      : analytics.baseScenario
            .isOnTrack
        ? "bg-emerald-50 text-emerald-700"
        : "bg-amber-50 text-amber-700";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Net worth goal
            </p>

            <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {formatCurrency(
                goal.targetAmount,
              )}
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
            className={`self-start rounded-full px-3 py-1.5 text-xs font-semibold ${statusClassName}`}
          >
            {baseStatus}
          </span>
        </div>

        <div className="mt-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-400">
                Current progress
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {percentageFormatter.format(
                  analytics.currentProgress,
                )}
                %
              </p>
            </div>

            <p className="text-right text-xs text-slate-400">
              Remaining
              <span className="mt-1 block text-sm font-semibold text-slate-700">
                {formatCurrency(
                  analytics.remainingAmount,
                )}
              </span>
            </p>
          </div>

          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${progressWidth}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Current net worth"
            value={formatCurrency(
              analytics.currentNetWorth,
            )}
            description="Investments + cash."
            icon={
              <span className="text-sm font-bold">
                $
              </span>
            }
          />

          <MetricCard
            label="Investments"
            value={formatCurrency(
              analytics.investments,
            )}
            description="Current market value."
            icon={
              <span className="text-sm">
                ↗
              </span>
            }
          />

          <MetricCard
            label="Cash"
            value={formatCurrency(
              analytics.cash,
            )}
            description={`${returnFormatter.format(
              analytics.cashAnnualReturn,
            )}% weighted annual yield.`}
            icon={
              <span className="text-sm">
                ▣
              </span>
            }
          />

          <MetricCard
            label="Monthly contribution"
            value={formatCurrency(
              goal.monthlyContribution,
            )}
            description="Planned new investment."
            icon={
              <span className="text-sm">
                +
              </span>
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Return scenarios
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Compare how investment
            returns affect the monthly
            contribution needed to hit
            your target.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {analytics.scenarios.map(
            (scenario) => {
              const isBase =
                scenario.id ===
                "base";

              const contributionGap =
                Math.max(
                  scenario.requiredContribution -
                    goal.monthlyContribution,
                  0,
                );

              return (
                <article
                  key={scenario.id}
                  className={`rounded-2xl border p-5 ${
                    isBase
                      ? "border-blue-200 bg-blue-50/40"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {scenario.label}
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {returnFormatter.format(
                          scenario.annualReturn,
                        )}
                        %
                      </p>
                    </div>

                    {isBase && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        Your assumption
                      </span>
                    )}
                  </div>

                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-400">
                        Required monthly
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {formatCurrency(
                          scenario.requiredContribution,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Projected at target date
                      </p>

                      <p
                        className={`mt-1 font-semibold ${
                          scenario.isOnTrack
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {formatCurrency(
                          scenario.projectedValue,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Estimated completion
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {scenario.estimatedCompletionDate
                          ? monthYearFormatter.format(
                              scenario.estimatedCompletionDate,
                            )
                          : "Not reached"}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      {scenario.isOnTrack ? (
                        <p className="text-xs font-medium leading-5 text-emerald-600">
                          Your planned
                          contribution is on
                          track in this scenario.
                        </p>
                      ) : (
                        <p className="text-xs font-medium leading-5 text-amber-600">
                          Add approximately{" "}
                          {formatCurrency(
                            contributionGap,
                          )}{" "}
                          more per month.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Base projection
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Expected net worth using
            your {returnFormatter.format(
              goal.annualReturn,
            )}
            % investment assumption.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {analytics.checkpoints.map(
            (checkpoint) => {
              const progress =
                goal.targetAmount > 0
                  ? (checkpoint.value /
                      goal.targetAmount) *
                    100
                  : 0;

              return (
                <article
                  key={checkpoint.month}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-xs font-medium text-slate-400">
                    {checkpoint.month ===
                    0
                      ? "Today"
                      : monthYearFormatter.format(
                          checkpoint.date,
                        )}
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {formatCurrency(
                      checkpoint.value,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {percentageFormatter.format(
                      progress,
                    )}
                    % of goal
                  </p>
                </article>
              );
            },
          )}
        </div>

        {!analytics.isGoalReached &&
          !analytics.baseScenario
            .isOnTrack && (
            <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700">
              At your base return,
              increase your monthly
              contribution by
              approximately{" "}
              <strong>
                {formatCurrency(
                  analytics.contributionGap,
                )}
              </strong>{" "}
              to reach the goal by the
              selected date.
            </div>
          )}

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Investments use the selected
          scenario return. Existing cash
          uses its current weighted yield.
          Monthly contributions are assumed
          to be invested at the end of each
          month. These are projections, not
          guaranteed results.
        </p>
      </section>
    </div>
  );
};

export default GoalOverview;