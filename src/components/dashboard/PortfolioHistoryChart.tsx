import {
  useMemo,
  useState,
  type PointerEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useCashStore from "../../store/cashStore";
import useWealthHistoryStore, {
  type WealthSnapshot,
} from "../../store/wealthHistoryStore";

type HistoryRange =
  | "30d"
  | "90d"
  | "1y"
  | "all";

type ChartPoint = {
  snapshot: WealthSnapshot;
  x: number;
  netWorthY: number;
  investmentValueY: number;
};

const CHART_WIDTH = 900;
const CHART_HEIGHT = 320;

const PADDING_LEFT = 72;
const PADDING_RIGHT = 24;
const PADDING_TOP = 24;
const PADDING_BOTTOM = 46;

const shortDateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  );

const detailedDateFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );

const rangeOptions: Array<{
  value: HistoryRange;
  label: string;
}> = [
  {
    value: "30d",
    label: "30D",
  },
  {
    value: "90d",
    label: "90D",
  },
  {
    value: "1y",
    label: "1Y",
  },
  {
    value: "all",
    label: "All",
  },
];

const getRangeStart = (
  range: HistoryRange,
) => {
  if (range === "all") {
    return null;
  }

  const days =
    range === "30d"
      ? 30
      : range === "90d"
        ? 90
        : 365;

  return (
    Date.now() -
    days *
      24 *
      60 *
      60 *
      1000
  );
};

const groupSnapshotsByDay = (
  snapshots: WealthSnapshot[],
) => {
  const snapshotsByDay =
    new Map<
      string,
      WealthSnapshot
    >();

  snapshots.forEach(
    (snapshot) => {
      const date =
        new Date(
          snapshot.timestamp,
        );

      const dayKey = [
        date.getFullYear(),

        String(
          date.getMonth() + 1,
        ).padStart(2, "0"),

        String(
          date.getDate(),
        ).padStart(2, "0"),
      ].join("-");

      snapshotsByDay.set(
        dayKey,
        snapshot,
      );
    },
  );

  return Array.from(
    snapshotsByDay.values(),
  ).sort(
    (
      firstSnapshot,
      secondSnapshot,
    ) =>
      new Date(
        firstSnapshot.timestamp,
      ).getTime() -
      new Date(
        secondSnapshot.timestamp,
      ).getTime(),
  );
};

const limitChartPoints = (
  snapshots: WealthSnapshot[],
  maximumPoints = 120,
) => {
  if (
    snapshots.length <=
    maximumPoints
  ) {
    return snapshots;
  }

  const sampledSnapshots =
    Array.from(
      {
        length:
          maximumPoints,
      },
      (_, index) => {
        const snapshotIndex =
          Math.round(
            (index /
              (maximumPoints -
                1)) *
              (snapshots.length -
                1),
          );

        return snapshots[
          snapshotIndex
        ];
      },
    );

  return Array.from(
    new Map(
      sampledSnapshots.map(
        (snapshot) => [
          snapshot.id,
          snapshot,
        ],
      ),
    ).values(),
  );
};

const createPath = (
  points: ChartPoint[],
  property:
    | "netWorthY"
    | "investmentValueY",
) => {
  return points
    .map(
      (point, index) => {
        const command =
          index === 0
            ? "M"
            : "L";

        return `${command} ${point.x.toFixed(
          2,
        )} ${point[
          property
        ].toFixed(2)}`;
      },
    )
    .join(" ");
};

const PortfolioHistoryChart =
  () => {
    const snapshots =
      useWealthHistoryStore(
        (state) =>
          state.snapshots,
      );

    const cashMovements =
      useCashStore(
        (state) =>
          state.movements,
      );

    const fxBaseCurrency =
      useCashStore(
        (state) =>
          state.fxBaseCurrency,
      );

    const fxRates =
      useCashStore(
        (state) =>
          state.fxRates,
      );

    const {
      currency,

      formatCurrency,

      formatSignedCurrency,

      formatCompactCurrency,
    } = useCurrencyFormatter();

    const [range, setRange] =
      useState<HistoryRange>(
        "30d",
      );

    const [
      hoveredIndex,
      setHoveredIndex,
    ] = useState<
      number | null
    >(null);

    const convertMovementToReportingCurrency =
      (
        amount: number,
        sourceCurrency:
          typeof currency,
      ) => {
        if (
          sourceCurrency ===
          currency
        ) {
          return amount;
        }

        if (
          fxBaseCurrency !==
          currency
        ) {
          return null;
        }

        const rate =
          fxRates[sourceCurrency];

        if (
          rate === undefined ||
          !Number.isFinite(
            rate,
          ) ||
          rate <= 0
        ) {
          return null;
        }

        return amount * rate;
      };

    const chartData =
      useMemo(() => {
        const currencySnapshots =
          snapshots.filter(
            (snapshot) =>
              snapshot.reportingCurrency ===
              currency,
          );

        const rangeStart =
          getRangeStart(range);

        const rangeSnapshots =
          rangeStart === null
            ? currencySnapshots
            : currencySnapshots.filter(
                (snapshot) =>
                  new Date(
                    snapshot.timestamp,
                  ).getTime() >=
                  rangeStart,
              );

        const snapshotsToUse =
          rangeSnapshots.length >
          0
            ? rangeSnapshots
            : currencySnapshots.slice(
                -1,
              );

        const dailySnapshots =
          groupSnapshotsByDay(
            snapshotsToUse,
          );

        const chartSnapshots =
          limitChartPoints(
            dailySnapshots,
          );

        if (
          chartSnapshots.length ===
          0
        ) {
          return null;
        }

        const values =
          chartSnapshots.flatMap(
            (snapshot) => [
              snapshot.netWorth,
              snapshot.investmentValue,
            ],
          );

        let minimumValue =
          Math.min(...values);

        let maximumValue =
          Math.max(...values);

        if (
          minimumValue ===
          maximumValue
        ) {
          const fallbackPadding =
            Math.max(
              Math.abs(
                minimumValue,
              ) * 0.05,
              1,
            );

          minimumValue -=
            fallbackPadding;

          maximumValue +=
            fallbackPadding;
        } else {
          const padding =
            (maximumValue -
              minimumValue) *
            0.08;

          minimumValue -=
            padding;

          maximumValue +=
            padding;
        }

        const plotWidth =
          CHART_WIDTH -
          PADDING_LEFT -
          PADDING_RIGHT;

        const plotHeight =
          CHART_HEIGHT -
          PADDING_TOP -
          PADDING_BOTTOM;

        const valueRange =
          maximumValue -
          minimumValue;

        const points:
          ChartPoint[] =
          chartSnapshots.map(
            (
              snapshot,
              index,
            ) => {
              const progress =
                chartSnapshots.length ===
                1
                  ? 0.5
                  : index /
                    (chartSnapshots.length -
                      1);

              const x =
                PADDING_LEFT +
                progress *
                  plotWidth;

              const netWorthY =
                PADDING_TOP +
                ((maximumValue -
                  snapshot.netWorth) /
                  valueRange) *
                  plotHeight;

              const investmentValueY =
                PADDING_TOP +
                ((maximumValue -
                  snapshot.investmentValue) /
                  valueRange) *
                  plotHeight;

              return {
                snapshot,
                x,
                netWorthY,
                investmentValueY,
              };
            },
          );

        const firstSnapshot =
          chartSnapshots[0];

        const latestSnapshot =
          chartSnapshots[
            chartSnapshots.length -
              1
          ];

        const firstTime =
          new Date(
            firstSnapshot.timestamp,
          ).getTime();

        const latestTime =
          new Date(
            latestSnapshot.timestamp,
          ).getTime();

        const periodChange =
          latestSnapshot.netWorth -
          firstSnapshot.netWorth;

        const periodChangePercentage =
          firstSnapshot.netWorth !==
          0
            ? (periodChange /
                firstSnapshot.netWorth) *
              100
            : 0;

        let externalDeposits = 0;
        let externalWithdrawals = 0;
        let missingContributionFx =
          false;

        cashMovements
          .filter(
            (movement) => {
              if (
                movement.type !==
                  "external_deposit" &&
                movement.type !==
                  "external_withdrawal"
              ) {
                return false;
              }

              const movementTime =
                new Date(
                  movement.date,
                ).getTime();

              return (
                Number.isFinite(
                  movementTime,
                ) &&
                movementTime >
                  firstTime &&
                movementTime <=
                  latestTime
              );
            },
          )
          .forEach(
            (movement) => {
              const converted =
                convertMovementToReportingCurrency(
                  Math.abs(
                    movement.amount,
                  ),
                  movement.currency,
                );

              if (
                converted === null
              ) {
                missingContributionFx =
                  true;
                return;
              }

              if (
                movement.type ===
                "external_deposit"
              ) {
                externalDeposits +=
                  converted;
              } else {
                externalWithdrawals +=
                  converted;
              }
            },
          );

        const netExternalFlow =
          externalDeposits -
          externalWithdrawals;

        const adjustedGrowth =
          missingContributionFx
            ? null
            : periodChange -
              netExternalFlow;

        const adjustedGrowthPercentage =
          adjustedGrowth !==
            null &&
          firstSnapshot.netWorth !==
            0
            ? (adjustedGrowth /
                firstSnapshot.netWorth) *
              100
            : null;

        const gridLines =
          Array.from(
            {
              length: 5,
            },
            (_, index) => {
              const progress =
                index / 4;

              return {
                y:
                  PADDING_TOP +
                  progress *
                    plotHeight,

                value:
                  maximumValue -
                  progress *
                    valueRange,
              };
            },
          );

        return {
          snapshots:
            chartSnapshots,

          points,

          gridLines,

          netWorthPath:
            createPath(
              points,
              "netWorthY",
            ),

          investmentPath:
            createPath(
              points,
              "investmentValueY",
            ),

          periodChange,

          periodChangePercentage,

          externalDeposits,

          externalWithdrawals,

          netExternalFlow,

          adjustedGrowth,

          adjustedGrowthPercentage,

          missingContributionFx,

          latestSnapshot,

          plotWidth,
        };
      }, [
        cashMovements,
        currency,
        fxBaseCurrency,
        fxRates,
        range,
        snapshots,
      ]);

    const handlePointerMove = (
      event: PointerEvent<SVGSVGElement>,
    ) => {
      if (
        !chartData ||
        chartData.points.length ===
          0
      ) {
        return;
      }

      if (
        chartData.points.length ===
        1
      ) {
        setHoveredIndex(0);
        return;
      }

      const bounds =
        event.currentTarget.getBoundingClientRect();

      const pointerX =
        ((event.clientX -
          bounds.left) /
          bounds.width) *
        CHART_WIDTH;

      const normalizedPosition =
        (pointerX -
          PADDING_LEFT) /
        chartData.plotWidth;

      const nextIndex =
        Math.round(
          normalizedPosition *
            (chartData.points.length -
              1),
        );

      setHoveredIndex(
        Math.min(
          Math.max(
            nextIndex,
            0,
          ),
          chartData.points.length -
            1,
        ),
      );
    };

    const hoveredPoint =
      chartData &&
      hoveredIndex !== null
        ? chartData.points[
            hoveredIndex
          ] ?? null
        : null;

    const changeClassName =
      chartData &&
      chartData.periodChange > 0
        ? "text-emerald-600"
        : chartData &&
            chartData.periodChange < 0
          ? "text-red-600"
          : "text-slate-900";

    const adjustedGrowthClassName =
      chartData &&
      chartData.adjustedGrowth !==
        null &&
      chartData.adjustedGrowth > 0
        ? "text-emerald-600"
        : chartData &&
            chartData.adjustedGrowth !==
              null &&
            chartData.adjustedGrowth <
              0
          ? "text-red-600"
          : "text-slate-900";

    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Wealth history
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Net worth evolution
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Separate external capital
              from growth generated
              inside your portfolio.
            </p>
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1">
            {rangeOptions.map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  onClick={() => {
                    setRange(
                      option.value,
                    );

                    setHoveredIndex(
                      null,
                    );
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    range ===
                    option.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {
                    option.label
                  }
                </button>
              ),
            )}
          </div>
        </div>

        {!chartData ? (
          <div className="flex min-h-80 items-center justify-center p-8 text-center">
            <div>
              <h3 className="font-semibold text-slate-900">
                No wealth history yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                JIS will begin
                recording your net
                worth in {currency}.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">
                  Net worth change
                </p>

                <p
                  className={`mt-2 text-lg font-bold ${changeClassName}`}
                >
                  {formatSignedCurrency(
                    chartData.periodChange,
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {chartData.periodChangePercentage >
                  0
                    ? "+"
                    : ""}
                  {chartData.periodChangePercentage.toFixed(
                    2,
                  )}
                  %
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">
                  Net external flow
                </p>

                <p className="mt-2 text-lg font-bold text-blue-600">
                  {chartData.missingContributionFx
                    ? "FX pending"
                    : formatSignedCurrency(
                        chartData.netExternalFlow,
                      )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Deposits minus
                  withdrawals.
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">
                  Growth excluding
                  external money
                </p>

                <p
                  className={`mt-2 text-lg font-bold ${adjustedGrowthClassName}`}
                >
                  {chartData.adjustedGrowth ===
                  null
                    ? "FX pending"
                    : formatSignedCurrency(
                        chartData.adjustedGrowth,
                      )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {chartData.adjustedGrowthPercentage ===
                  null
                    ? "Waiting for FX"
                    : `${
                        chartData.adjustedGrowthPercentage >
                        0
                          ? "+"
                          : ""
                      }${chartData.adjustedGrowthPercentage.toFixed(
                        2,
                      )}%`}
                </p>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium text-slate-500">
                  Current cash
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formatCurrency(
                    chartData
                      .latestSnapshot
                      .cashValue,
                  )}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Latest historical
                  snapshot.
                </p>
              </article>
            </div>

            <div className="p-5 sm:p-6">
              <div className="overflow-x-auto">
                <svg
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  className="min-w-[720px] w-full touch-none"
                  role="img"
                  aria-label="Historical net worth and investment value"
                  onPointerMove={
                    handlePointerMove
                  }
                  onPointerLeave={() =>
                    setHoveredIndex(
                      null,
                    )
                  }
                >
                  {chartData.gridLines.map(
                    (
                      gridLine,
                      index,
                    ) => (
                      <g
                        key={
                          index
                        }
                      >
                        <line
                          x1={
                            PADDING_LEFT
                          }
                          x2={
                            CHART_WIDTH -
                            PADDING_RIGHT
                          }
                          y1={
                            gridLine.y
                          }
                          y2={
                            gridLine.y
                          }
                          stroke="currentColor"
                          className="text-slate-100"
                        />

                        <text
                          x={
                            PADDING_LEFT -
                            12
                          }
                          y={
                            gridLine.y +
                            4
                          }
                          textAnchor="end"
                          className="fill-slate-400 text-[10px]"
                        >
                          {formatCompactCurrency(
                            gridLine.value,
                          )}
                        </text>
                      </g>
                    ),
                  )}

                  <path
                    d={
                      chartData.netWorthPath
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-600"
                  />

                  <path
                    d={
                      chartData.investmentPath
                    }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="7 6"
                    className="text-slate-400"
                  />

                  {chartData.points.length ===
                    1 && (
                    <>
                      <circle
                        cx={
                          chartData
                            .points[0]
                            .x
                        }
                        cy={
                          chartData
                            .points[0]
                            .netWorthY
                        }
                        r="5"
                        fill="currentColor"
                        className="text-blue-600"
                      />

                      <circle
                        cx={
                          chartData
                            .points[0]
                            .x
                        }
                        cy={
                          chartData
                            .points[0]
                            .investmentValueY
                        }
                        r="4"
                        fill="currentColor"
                        className="text-slate-400"
                      />
                    </>
                  )}

                  {hoveredPoint && (
                    <>
                      <line
                        x1={
                          hoveredPoint.x
                        }
                        x2={
                          hoveredPoint.x
                        }
                        y1={
                          PADDING_TOP
                        }
                        y2={
                          CHART_HEIGHT -
                          PADDING_BOTTOM
                        }
                        stroke="currentColor"
                        strokeDasharray="4 4"
                        className="text-slate-300"
                      />

                      <circle
                        cx={
                          hoveredPoint.x
                        }
                        cy={
                          hoveredPoint.netWorthY
                        }
                        r="5"
                        fill="currentColor"
                        className="text-blue-600"
                      />

                      <circle
                        cx={
                          hoveredPoint.x
                        }
                        cy={
                          hoveredPoint.investmentValueY
                        }
                        r="4"
                        fill="currentColor"
                        className="text-slate-500"
                      />
                    </>
                  )}

                  {chartData.snapshots.length >
                    0 && (
                    <>
                      <text
                        x={
                          PADDING_LEFT
                        }
                        y={
                          CHART_HEIGHT -
                          14
                        }
                        textAnchor="start"
                        className="fill-slate-400 text-[10px]"
                      >
                        {shortDateFormatter.format(
                          new Date(
                            chartData
                              .snapshots[0]
                              .timestamp,
                          ),
                        )}
                      </text>

                      <text
                        x={
                          CHART_WIDTH /
                          2
                        }
                        y={
                          CHART_HEIGHT -
                          14
                        }
                        textAnchor="middle"
                        className="fill-slate-400 text-[10px]"
                      >
                        {shortDateFormatter.format(
                          new Date(
                            chartData.snapshots[
                              Math.floor(
                                chartData
                                  .snapshots
                                  .length /
                                  2,
                              )
                            ].timestamp,
                          ),
                        )}
                      </text>

                      <text
                        x={
                          CHART_WIDTH -
                          PADDING_RIGHT
                        }
                        y={
                          CHART_HEIGHT -
                          14
                        }
                        textAnchor="end"
                        className="fill-slate-400 text-[10px]"
                      >
                        {shortDateFormatter.format(
                          new Date(
                            chartData
                              .snapshots[
                              chartData
                                .snapshots
                                .length -
                                1
                            ].timestamp,
                          ),
                        )}
                      </text>
                    </>
                  )}
                </svg>
              </div>

              {hoveredPoint && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">
                    {detailedDateFormatter.format(
                      new Date(
                        hoveredPoint
                          .snapshot
                          .timestamp,
                      ),
                    )}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">
                        Net worth
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatCurrency(
                          hoveredPoint
                            .snapshot
                            .netWorth,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Investments
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatCurrency(
                          hoveredPoint
                            .snapshot
                            .investmentValue,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Cash
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatCurrency(
                          hoveredPoint
                            .snapshot
                            .cashValue,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 bg-blue-600" />
                  Net worth
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-5 border-t-2 border-dashed border-slate-400" />
                  Investments
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Growth excluding
                external money equals
                the change in Net Worth
                minus deposits plus
                external withdrawals
                during the selected
                period. ETF purchases,
                ETF sales and dividends
                remain inside JIS and
                are not classified as
                contributions.
              </p>
            </div>
          </>
        )}
      </section>
    );
  };

export default PortfolioHistoryChart;