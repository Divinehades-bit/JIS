import { useMemo } from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useGoalStore from "../../store/goalStore";
import useWealthSummary from "../../hooks/useWealthSummary";

type ScenarioId =
  | "conservative"
  | "base"
  | "optimistic";

type ProjectionPoint = {
  month: number;
  value: number;
};

type ProjectionScenario = {
  id: ScenarioId;
  label: string;
  annualReturn: number;
  points: ProjectionPoint[];
  projectedAtTarget: number;
  completionMonth: number | null;
};

const CHART_WIDTH = 1000;
const CHART_HEIGHT = 400;

const PADDING = {
  top: 28,
  right: 28,
  bottom: 55,
  left: 95,
};

const MAX_PROJECTION_MONTHS = 600;

const percentageFormatter =
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const monthYearFormatter =
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
  });

const shortDateFormatter =
  new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
    month: "short",
  });

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

const addMonths = (
  date: Date,
  months: number,
) => {
  const result = new Date(date);

  result.setMonth(
    result.getMonth() + months,
  );

  return result;
};

const getMonthsUntilDate = (
  targetDate: string,
) => {
  const today = new Date();

  const target = new Date(
    `${targetDate}T12:00:00`,
  );

  if (
    Number.isNaN(
      target.getTime(),
    ) ||
    target <= today
  ) {
    return 0;
  }

  let months =
    (target.getFullYear() -
      today.getFullYear()) *
      12 +
    target.getMonth() -
    today.getMonth();

  if (
    target.getDate() >
    today.getDate()
  ) {
    months += 1;
  }

  return Math.max(months, 1);
};

const calculateValueAtMonth = (
  investments: number,
  cash: number,
  monthlyContribution: number,
  investmentMonthlyReturn: number,
  cashMonthlyReturn: number,
  month: number,
) => {
  const investmentPrincipal =
    investments *
    Math.pow(
      1 + investmentMonthlyReturn,
      month,
    );

  let futureContributions = 0;

  if (monthlyContribution > 0) {
    if (investmentMonthlyReturn === 0) {
      futureContributions =
        monthlyContribution * month;
    } else {
      const growthFactor =
        Math.pow(
          1 + investmentMonthlyReturn,
          month,
        );

      futureContributions =
        monthlyContribution *
        ((growthFactor - 1) /
          investmentMonthlyReturn);
    }
  }

  const futureCash =
    cash *
    Math.pow(
      1 + cashMonthlyReturn,
      month,
    );

  return (
    investmentPrincipal +
    futureContributions +
    futureCash
  );
};

const findCompletionMonth = (
  investments: number,
  cash: number,
  monthlyContribution: number,
  investmentMonthlyReturn: number,
  cashMonthlyReturn: number,
  targetAmount: number,
) => {
  if (
    investments + cash >=
    targetAmount
  ) {
    return 0;
  }

  for (
    let month = 1;
    month <= MAX_PROJECTION_MONTHS;
    month += 1
  ) {
    const value =
      calculateValueAtMonth(
        investments,
        cash,
        monthlyContribution,
        investmentMonthlyReturn,
        cashMonthlyReturn,
        month,
      );

    if (value >= targetAmount) {
      return month;
    }
  }

  return null;
};

const GoalProjectionChart = () => {
  const goal = useGoalStore(
    (state) => state.goal,
  );

  const wealth =
    useWealthSummary();

  const { formatCurrency } =
    useCurrencyFormatter();

  const projection = useMemo(() => {
    if (
      !goal ||
      wealth.netWorth === null ||
      wealth.investmentCurrentValue ===
        null
    ) {
      return null;
    }

    const targetMonths =
      getMonthsUntilDate(
        goal.targetDate,
      );

    if (targetMonths <= 0) {
      return null;
    }

    const investments =
      wealth.investmentCurrentValue;

    const cash =
      wealth.totalCash;

    const cashMonthlyReturn =
      annualToMonthlyRate(
        wealth.cashWeightedYield,
      );

    const scenarioDefinitions = [
      {
        id: "conservative" as const,
        label: "Conservative",
        annualReturn: Math.max(
          goal.annualReturn - 2,
          0,
        ),
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
        annualReturn: Math.min(
          goal.annualReturn + 2,
          100,
        ),
      },
    ];

    const scenarios:
      ProjectionScenario[] =
      scenarioDefinitions.map(
        (scenario) => {
          const investmentMonthlyReturn =
            annualToMonthlyRate(
              scenario.annualReturn,
            );

          const points =
            Array.from(
              {
                length:
                  targetMonths + 1,
              },
              (_, month) => ({
                month,
                value:
                  calculateValueAtMonth(
                    investments,
                    cash,
                    goal.monthlyContribution,
                    investmentMonthlyReturn,
                    cashMonthlyReturn,
                    month,
                  ),
              }),
            );

          return {
            ...scenario,

            points,

            projectedAtTarget:
              points[
                points.length - 1
              ]?.value ??
              wealth.netWorth,

            completionMonth:
              findCompletionMonth(
                investments,
                cash,
                goal.monthlyContribution,
                investmentMonthlyReturn,
                cashMonthlyReturn,
                goal.targetAmount,
              ),
          };
        },
      );

    const maximumProjectedValue =
      Math.max(
        goal.targetAmount,

        ...scenarios.flatMap(
          (scenario) =>
            scenario.points.map(
              (point) => point.value,
            ),
        ),
      );

    const yMaximum =
      maximumProjectedValue * 1.1;

    const yTicks = Array.from(
      { length: 5 },
      (_, index) =>
        (yMaximum / 4) * index,
    );

    const today = new Date();

    const xTicks = Array.from(
      { length: 5 },
      (_, index) =>
        Math.round(
          (targetMonths / 4) *
            index,
        ),
    );

    return {
      targetMonths,
      scenarios,
      yMaximum,
      yTicks,
      xTicks,
      today,
    };
  }, [
    goal,
    wealth.netWorth,
    wealth.investmentCurrentValue,
    wealth.totalCash,
    wealth.cashWeightedYield,
  ]);

  if (!goal) {
    return null;
  }

  if (
    !wealth.hasCompleteFx ||
    !projection
  ) {
    return (
      <section className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
        <h2 className="font-semibold text-amber-800">
          Projection unavailable
        </h2>

        <p className="mt-2 text-sm text-amber-700">
          JIS needs complete exchange
          rates and a valid future goal
          date before drawing the
          projection.
        </p>
      </section>
    );
  }

  const plotWidth =
    CHART_WIDTH -
    PADDING.left -
    PADDING.right;

  const plotHeight =
    CHART_HEIGHT -
    PADDING.top -
    PADDING.bottom;

  const getX = (
    month: number,
  ) =>
    PADDING.left +
    (month /
      projection.targetMonths) *
      plotWidth;

  const getY = (
    value: number,
  ) =>
    PADDING.top +
    plotHeight -
    (value /
      projection.yMaximum) *
      plotHeight;

  const getPolylinePoints = (
    scenario: ProjectionScenario,
  ) =>
    scenario.points
      .map(
        (point) =>
          `${getX(
            point.month,
          )},${getY(point.value)}`,
      )
      .join(" ");

  const targetY = getY(
    goal.targetAmount,
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <p className="text-sm font-medium text-slate-500">
          Wealth projection
        </p>

        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          Path to your goal
        </h2>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          Estimated net worth growth
          through your selected target
          date using conservative, base
          and optimistic investment
          returns.
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-0.5 w-5 bg-amber-500" />
            Conservative
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-0.5 w-5 bg-blue-600" />
            Base
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-0.5 w-5 bg-emerald-600" />
            Optimistic
          </div>

          <div className="flex items-center gap-2 text-slate-600">
            <span className="h-0.5 w-5 border-t-2 border-dashed border-slate-400" />
            Goal
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="min-w-[760px] w-full"
            role="img"
            aria-label="Financial goal projection chart"
          >
            {projection.yTicks.map(
              (tick) => {
                const y = getY(tick);

                return (
                  <g key={tick}>
                    <line
                      x1={PADDING.left}
                      x2={
                        CHART_WIDTH -
                        PADDING.right
                      }
                      y1={y}
                      y2={y}
                      className="text-slate-100"
                      stroke="currentColor"
                    />

                    <text
                      x={
                        PADDING.left -
                        14
                      }
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[11px]"
                    >
                      {formatCurrency(
                        tick,
                      )}
                    </text>
                  </g>
                );
              },
            )}

            {projection.xTicks.map(
              (month) => {
                const x = getX(month);

                return (
                  <g key={month}>
                    <line
                      x1={x}
                      x2={x}
                      y1={PADDING.top}
                      y2={
                        PADDING.top +
                        plotHeight
                      }
                      className="text-slate-100"
                      stroke="currentColor"
                    />

                    <text
                      x={x}
                      y={
                        CHART_HEIGHT -
                        20
                      }
                      textAnchor="middle"
                      className="fill-slate-400 text-[11px]"
                    >
                      {month === 0
                        ? "Today"
                        : shortDateFormatter.format(
                            addMonths(
                              projection.today,
                              month,
                            ),
                          )}
                    </text>
                  </g>
                );
              },
            )}

            <line
              x1={PADDING.left}
              x2={
                CHART_WIDTH -
                PADDING.right
              }
              y1={targetY}
              y2={targetY}
              strokeDasharray="8 7"
              className="text-slate-400"
              stroke="currentColor"
              strokeWidth="2"
            />

            <text
              x={
                CHART_WIDTH -
                PADDING.right
              }
              y={targetY - 8}
              textAnchor="end"
              className="fill-slate-500 text-[11px] font-semibold"
            >
              Goal{" "}
              {formatCurrency(
                goal.targetAmount,
              )}
            </text>

            <polyline
              points={getPolylinePoints(
                projection.scenarios[0],
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-500"
            />

            <polyline
              points={getPolylinePoints(
                projection.scenarios[1],
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600"
            />

            <polyline
              points={getPolylinePoints(
                projection.scenarios[2],
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-emerald-600"
            />
          </svg>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {projection.scenarios.map(
            (scenario) => {
              const completionDate =
                scenario.completionMonth ===
                null
                  ? null
                  : addMonths(
                      projection.today,
                      scenario.completionMonth,
                    );

              const reachedByTarget =
                scenario.projectedAtTarget >=
                goal.targetAmount;

              const cardClassName =
                scenario.id === "base"
                  ? "border-blue-200 bg-blue-50/40"
                  : "border-slate-200 bg-white";

              return (
                <article
                  key={scenario.id}
                  className={`rounded-2xl border p-5 ${cardClassName}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {scenario.label}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {percentageFormatter.format(
                          scenario.annualReturn,
                        )}
                        % annual investment
                        return
                      </p>
                    </div>

                    {scenario.id ===
                      "base" && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                        BASE
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <p className="text-xs text-slate-400">
                      At target date
                    </p>

                    <p
                      className={`mt-1 text-lg font-bold ${
                        reachedByTarget
                          ? "text-emerald-600"
                          : "text-slate-900"
                      }`}
                    >
                      {formatCurrency(
                        scenario.projectedAtTarget,
                      )}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">
                      Goal reached
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {scenario.completionMonth ===
                      0
                        ? "Already reached"
                        : completionDate
                          ? monthYearFormatter.format(
                              completionDate,
                            )
                          : "More than 50 years"}
                    </p>
                  </div>

                  <p
                    className={`mt-3 text-xs font-medium ${
                      reachedByTarget
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {reachedByTarget
                      ? "Goal reached by your target date."
                      : "Goal reached after your target date."}
                  </p>
                </article>
              );
            },
          )}
        </div>

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Existing investments grow
          using each scenario return.
          Existing cash grows at its
          current weighted yield and
          monthly contributions are
          assumed to be invested.
          Projections are estimates,
          not guaranteed outcomes.
        </p>
      </div>
    </section>
  );
};

export default GoalProjectionChart;