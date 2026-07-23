import {
  useMemo,
  useState,
  type PointerEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
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
      const date = new Date(
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

      /*
       * The latest snapshot of
       * each day wins.
       */
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
        length: maximumPoints,
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

    const {
      currency,
      formatCurrency,
      formatSignedCurrency,
      formatCompactCurrency,
    } =
      useCurrencyFormatter();

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

    const chartData =
      useMemo(() => {
        /*
         * Never mix currencies on
         * the same historical chart.
         */
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

        const highestValue =
          Math.max(
            ...chartSnapshots.map(
              (snapshot) =>
                snapshot.netWorth,
            ),
          );

        const lowestValue =
          Math.min(
            ...chartSnapshots.map(
              (snapshot) =>
                snapshot.netWorth,
            ),
          );

        const gridLines =
          Array.from(
            { length: 5 },

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

          highestValue,

          lowestValue,

          latestSnapshot,

          plotWidth,
        };
      }, [
        currency,
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

    const performanceClassName =
      chartData &&
      chartData.periodChange >
        0
        ? "text-emerald-600"
        : chartData &&
            chartData.periodChange <
              0
          ? "text-red-600"
          : "text-slate-700";

    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Net worth evolution
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Historical evolution of
              investments and total
              wealth including cash.
            </p>
          </div>

          <div className="inline-flex self-start rounded-xl bg-slate-100 p-1">
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
                  {option.label}
                </button>
              ),
            )}
          </div>
        </div>

        {!chartData ? (
          <div className="flex min-h-72 items-center justify-center p-8 text-center">
            <div>
              <h3 className="font-semibold text-slate-900">
                No wealth history
                yet
              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500">
                JIS will begin
                recording your net
                worth in{" "}
                {currency} from now
                on.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 px-5 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Period change
                </p>

                <p
                  className={`mt-1 text-lg font-bold ${performanceClassName}`}
                >
                  {formatSignedCurrency(
                    chartData.periodChange,
                  )}
                </p>

                <p
                  className={`mt-0.5 text-xs font-semibold ${performanceClassName}`}
                >
                  {chartData
                    .periodChangePercentage >
                  0
                    ? "+"
                    : ""}

                  {chartData.periodChangePercentage.toFixed(
                    2,
                  )}
                  %
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Period high
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatCurrency(
                    chartData.highestValue,
                  )}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Current cash
                </p>

                <p className="mt-1 text-lg font-bold text-slate-900">
                  {formatCurrency(
                    chartData
                      .latestSnapshot
                      .cashValue,
                  )}
                </p>
              </div>
            </div>

            <div className="relative px-2 pb-2 pt-4 sm:px-5">
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                role="img"
                aria-label="Net worth history chart"
                className="h-auto w-full touch-none"
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
                  (gridLine) => (
                    <g
                      key={
                        gridLine.y
                      }
                    >
                      <line
                        x1={
                          PADDING_LEFT
                        }
                        y1={
                          gridLine.y
                        }
                        x2={
                          CHART_WIDTH -
                          PADDING_RIGHT
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
                          10
                        }
                        y={
                          gridLine.y +
                          4
                        }
                        textAnchor="end"
                        className="fill-slate-400 text-[11px]"
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
                    chartData.investmentPath
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                  className="text-slate-400"
                />

                <path
                  d={
                    chartData.netWorthPath
                  }
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-blue-600"
                />

                {chartData.points
                  .length === 1 && (
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
                  <g>
                    <line
                      x1={
                        hoveredPoint.x
                      }
                      y1={
                        PADDING_TOP
                      }
                      x2={
                        hoveredPoint.x
                      }
                      y2={
                        CHART_HEIGHT -
                        PADDING_BOTTOM
                      }
                      stroke="currentColor"
                      strokeWidth="1"
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
                      r="6"
                      fill="white"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-blue-600"
                    />

                    <circle
                      cx={
                        hoveredPoint.x
                      }
                      cy={
                        hoveredPoint.investmentValueY
                      }
                      r="5"
                      fill="white"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-slate-400"
                    />
                  </g>
                )}

                {chartData.snapshots
                  .length > 0 && (
                  <>
                    <text
                      x={
                        PADDING_LEFT
                      }
                      y={
                        CHART_HEIGHT -
                        12
                      }
                      textAnchor="start"
                      className="fill-slate-400 text-[11px]"
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
                        12
                      }
                      textAnchor="middle"
                      className="fill-slate-400 text-[11px]"
                    >
                      {shortDateFormatter.format(
                        new Date(
                          chartData
                            .snapshots[
                            Math.floor(
                              chartData
                                .snapshots
                                .length /
                                2,
                            )
                          ]
                            .timestamp,
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
                        12
                      }
                      textAnchor="end"
                      className="fill-slate-400 text-[11px]"
                    >
                      {shortDateFormatter.format(
                        new Date(
                          chartData
                            .snapshots[
                            chartData
                              .snapshots
                              .length -
                              1
                          ]
                            .timestamp,
                        ),
                      )}
                    </text>
                  </>
                )}
              </svg>

              {hoveredPoint && (
                <div className="pointer-events-none absolute right-5 top-5 rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
                  <p className="font-semibold text-slate-900">
                    {detailedDateFormatter.format(
                      new Date(
                        hoveredPoint
                          .snapshot
                          .timestamp,
                      ),
                    )}
                  </p>

                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-500">
                        Net worth
                      </span>

                      <span className="font-semibold text-blue-600">
                        {formatCurrency(
                          hoveredPoint
                            .snapshot
                            .netWorth,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-500">
                        Investments
                      </span>

                      <span className="font-semibold text-slate-700">
                        {formatCurrency(
                          hoveredPoint
                            .snapshot
                            .investmentValue,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-500">
                        Cash
                      </span>

                      <span className="font-semibold text-slate-700">
                        {formatCurrency(
                          hoveredPoint
                            .snapshot
                            .cashValue,
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-500">
                        Investment
                        return
                      </span>

                      <span className="font-semibold text-slate-700">
                        {hoveredPoint
                          .snapshot
                          .investmentReturn >
                        0
                          ? "+"
                          : ""}

                        {hoveredPoint.snapshot.investmentReturn.toFixed(
                          2,
                        )}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-5 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-5 rounded-full bg-blue-600" />

                Net worth
              </div>

              <div className="flex items-center gap-2">
                <span className="h-0.5 w-5 border-t-2 border-dashed border-slate-400" />

                Investments
              </div>

              <p className="basis-full text-[11px] leading-5 text-slate-400">
                Older snapshots created
                before cash tracking may
                contain investments only.
              </p>
            </div>
          </>
        )}
      </section>
    );
  };

export default PortfolioHistoryChart;