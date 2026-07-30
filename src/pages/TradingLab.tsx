import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock3,
  FlaskConical,
  LineChart,
  RefreshCw,
  Target,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  WatchlistTrendDirection,
  WatchlistTrendResult,
} from "../services/watchlistTrendService";

import type {
  PaperTrade,
  WatchlistItem,
} from "../store/tradingLabStore";

import useTradingLabStore from "../store/tradingLabStore";
import useWatchlistTrendStore from "../store/watchlistTrendStore";

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  valueClassName?: string;
};

type FeedbackMessage = {
  type: "success" | "error";
  text: string;
};

type ComparisonPeriod =
  | 21
  | 63
  | 126
  | 252;

type ComparisonSeries = {
  symbol: string;
  values: number[];
  color: string;
  finalValue: number;
};

const moneyFormatter =
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dateFormatter =
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  });

const dateTimeFormatter =
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const comparisonColors = [
  "#2563eb",
  "#059669",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#65a30d",
];

const comparisonPeriodOptions: {
  value: ComparisonPeriod;
  label: string;
}[] = [
  {
    value: 21,
    label: "1M",
  },
  {
    value: 63,
    label: "3M",
  },
  {
    value: 126,
    label: "6M",
  },
  {
    value: 252,
    label: "1Y",
  },
];

const SummaryCard = ({
  title,
  value,
  description,
  icon,
  valueClassName = "text-slate-900",
}: SummaryCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p
            className={`mt-3 break-words text-2xl font-bold tabular-nums ${valueClassName}`}
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

const formatDate = (
  value: string | null,
): string => {
  if (!value) {
    return "Pending";
  }

  const parsedDate =
    new Date(
      value.length === 10
        ? `${value}T12:00:00`
        : value,
    );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return value;
  }

  return dateFormatter.format(
    parsedDate,
  );
};

const formatDateTime = (
  value: string | null,
): string => {
  if (!value) {
    return "Never updated";
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return value;
  }

  return dateTimeFormatter.format(
    parsedDate,
  );
};

const formatReturn = (
  value: number,
): string => {
  if (
    Math.abs(value) <
    0.005
  ) {
    return "0.00%";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(
    2,
  )}%`;
};

const formatNullableReturn = (
  value: number | null,
): string => {
  if (value === null) {
    return "Pending";
  }

  return formatReturn(value);
};

const getReturnClassName = (
  value: number,
): string => {
  if (value > 0) {
    return "text-emerald-600";
  }

  if (value < 0) {
    return "text-red-600";
  }

  return "text-slate-600";
};

const getNullableReturnClassName = (
  value: number | null,
): string => {
  if (value === null) {
    return "text-slate-400";
  }

  return getReturnClassName(value);
};

const getRiskClassName = (
  risk: PaperTrade["riskAtEntry"],
): string => {
  if (risk === "Low") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (risk === "Medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-red-100 text-red-700";
};

const getTrendClassName = (
  trend: WatchlistTrendDirection,
): string => {
  if (trend === "Bullish") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (trend === "Bearish") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
};


const getRetryText = (
  nextRetryAt: string | null,
  currentTime: number,
): string | null => {
  if (!nextRetryAt) {
    return null;
  }

  const remainingSeconds =
    Math.max(
      0,
      Math.ceil(
        (new Date(
          nextRetryAt,
        ).getTime() -
          currentTime) /
          1000,
      ),
    );

  const minutes =
    Math.floor(
      remainingSeconds / 60,
    );

  const seconds =
    remainingSeconds % 60;

  return `${minutes}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

const createPolyline = (
  values: number[],
  width: number,
  height: number,
  padding: number,
): string => {
  if (values.length === 0) {
    return "";
  }

  const minimum =
    Math.min(...values);

  const maximum =
    Math.max(...values);

  const range =
    maximum - minimum;

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : padding +
            (index /
              (values.length -
                1)) *
              (width -
                padding * 2);

      const normalized =
        range === 0
          ? 0.5
          : (value -
              minimum) /
            range;

      const y =
        height -
        padding -
        normalized *
          (height -
            padding * 2);

      return `${x.toFixed(
        2,
      )},${y.toFixed(2)}`;
    })
    .join(" ");
};

const TrendSparkline = ({
  trend,
}: {
  trend: WatchlistTrendResult;
}) => {
  const width = 240;
  const height = 72;
  const padding = 5;

  const values =
    trend.points
      .slice(-63)
      .map(
        (point) =>
          point.close,
      );

  const polyline =
    createPolyline(
      values,
      width,
      height,
      padding,
    );

  const startValue =
    values[0] ??
    trend.currentPrice;

  const endValue =
    values.at(-1) ??
    trend.currentPrice;

  const positive =
    endValue >=
    startValue;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${trend.symbol} recent price trend`}
    >
      <line
        x1="0"
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="#e2e8f0"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      <polyline
        points={polyline}
        fill="none"
        stroke={
          positive
            ? "#059669"
            : "#dc2626"
        }
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const PeriodReturn = ({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) => {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-bold tabular-nums ${getNullableReturnClassName(
          value,
        )}`}
      >
        {formatNullableReturn(
          value,
        )}
      </p>
    </div>
  );
};

const WatchlistTrendCard = ({
  item,
  trend,
  onRemove,
}: {
  item: WatchlistItem;
  trend:
    | WatchlistTrendResult
    | undefined;
  onRemove: () => void;
}) => {
  const returnSinceAdded =
    trend &&
    item.sourcePrice > 0
      ? (trend.currentPrice /
          item.sourcePrice -
          1) *
        100
      : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xl font-bold text-slate-900">
              {item.symbol}
            </p>

            {trend && (
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTrendClassName(
                  trend.trend,
                )}`}
              >
                {trend.trend}
              </span>
            )}
          </div>

          <p className="mt-1 truncate text-sm font-medium text-slate-600">
            {item.name}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {item.sector}
          </p>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove ${item.symbol} from watchlist`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {trend ? (
        <>
          <div className="border-y border-slate-100 bg-slate-50/40 px-4 py-3">
            <TrendSparkline
              trend={trend}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 p-5">
            <div>
              <p className="text-xs text-slate-400">
                Current price
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">
                {moneyFormatter.format(
                  trend.currentPrice,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {formatDate(
                  trend.latestMarketDate,
                )}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">
                Since added
              </p>

              <p
                className={`mt-1 text-xl font-bold tabular-nums ${getNullableReturnClassName(
                  returnSinceAdded,
                )}`}
              >
                {formatNullableReturn(
                  returnSinceAdded,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Radar price{" "}
                {moneyFormatter.format(
                  item.sourcePrice,
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 px-5 pb-5">
            <PeriodReturn
              label="1M"
              value={
                trend.change1mPct
              }
            />

            <PeriodReturn
              label="3M"
              value={
                trend.change3mPct
              }
            />

            <PeriodReturn
              label="6M"
              value={
                trend.change6mPct
              }
            />

            <PeriodReturn
              label="1Y"
              value={
                trend.change1yPct
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                SMA 20
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700 tabular-nums">
                {moneyFormatter.format(
                  trend.sma20,
                )}
              </p>

              <p
                className={`mt-1 text-xs font-medium ${getReturnClassName(
                  trend.distanceToSma20Pct,
                )}`}
              >
                {formatReturn(
                  trend.distanceToSma20Pct,
                )}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                SMA 50
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700 tabular-nums">
                {moneyFormatter.format(
                  trend.sma50,
                )}
              </p>

              <p
                className={`mt-1 text-xs font-medium ${getReturnClassName(
                  trend.distanceToSma50Pct,
                )}`}
              >
                {formatReturn(
                  trend.distanceToSma50Pct,
                )}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-slate-400">
                52-week range
              </span>

              <span className="font-semibold text-slate-600 tabular-nums">
                {moneyFormatter.format(
                  trend.low52w,
                )}{" "}
                –{" "}
                {moneyFormatter.format(
                  trend.high52w,
                )}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${Math.min(
                    Math.max(
                      trend.rangePosition52wPct,
                      0,
                    ),
                    100,
                  )}%`,
                }}
              />
            </div>

            <p className="mt-2 text-right text-xs text-slate-400">
              {trend.rangePosition52wPct.toFixed(
                1,
              )}
              % of yearly range
            </p>
          </div>
        </>
      ) : (
        <div className="flex min-h-64 items-center justify-center border-t border-slate-100 bg-slate-50/50 p-6 text-center">
          <div>
            <LineChart className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              Trend pending
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Press Update trends to
              load one year of market
              history.
            </p>
          </div>
        </div>
      )}
    </article>
  );
};

const WatchlistComparisonChart = ({
  trends,
  period,
}: {
  trends: WatchlistTrendResult[];
  period: ComparisonPeriod;
}) => {
  const width = 1000;
  const height = 340;
  const paddingLeft = 58;
  const paddingRight = 24;
  const paddingTop = 25;
  const paddingBottom = 42;

  const chartData =
    useMemo(() => {
      const series:
        ComparisonSeries[] =
          trends
            .map(
              (
                trend,
                index,
              ) => {
                const periodPoints =
                  trend.points.slice(
                    -(period + 1),
                  );

                const basePrice =
                  periodPoints[0]
                    ?.close;

                if (
                  !basePrice ||
                  basePrice <= 0 ||
                  periodPoints.length <
                    2
                ) {
                  return null;
                }

                const values =
                  periodPoints.map(
                    (point) =>
                      (point.close /
                        basePrice) *
                      100,
                  );

                return {
                  symbol:
                    trend.symbol,

                  values,

                  color:
                    comparisonColors[
                      index %
                        comparisonColors.length
                    ],

                  finalValue:
                    values.at(-1) ??
                    100,
                };
              },
            )
            .filter(
              (
                item,
              ): item is ComparisonSeries =>
                item !== null,
            );

      const allValues =
        series.flatMap(
          (item) =>
            item.values,
        );

      if (
        allValues.length === 0
      ) {
        return {
          series,
          minimum: 95,
          maximum: 105,
        };
      }

      const rawMinimum =
        Math.min(
          ...allValues,
          100,
        );

      const rawMaximum =
        Math.max(
          ...allValues,
          100,
        );

      const padding =
        Math.max(
          (rawMaximum -
            rawMinimum) *
            0.1,
          1,
        );

      return {
        series,

        minimum:
          rawMinimum -
          padding,

        maximum:
          rawMaximum +
          padding,
      };
    }, [trends, period]);

  const chartWidth =
    width -
    paddingLeft -
    paddingRight;

  const chartHeight =
    height -
    paddingTop -
    paddingBottom;

  const range =
    chartData.maximum -
    chartData.minimum;

  const getY = (
    value: number,
  ) => {
    if (range <= 0) {
      return (
        paddingTop +
        chartHeight / 2
      );
    }

    return (
      paddingTop +
      ((chartData.maximum -
        value) /
        range) *
        chartHeight
    );
  };

  const baselineY =
    getY(100);

  const gridValues = [
    chartData.maximum,
    chartData.maximum -
      range * 0.25,
    chartData.maximum -
      range * 0.5,
    chartData.maximum -
      range * 0.75,
    chartData.minimum,
  ];

  if (
    chartData.series.length ===
    0
  ) {
    return (
      <div className="flex min-h-72 items-center justify-center text-center">
        <div>
          <LineChart className="mx-auto h-9 w-9 text-slate-300" />

          <p className="mt-3 font-semibold text-slate-700">
            Comparison pending
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Update Watchlist Trends
            to generate the Base 100
            comparison.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[700px] w-full"
          role="img"
          aria-label="Watchlist Base 100 performance comparison"
        >
          {gridValues.map(
            (value) => {
              const y =
                getY(value);

              return (
                <g
                  key={value}
                >
                  <line
                    x1={
                      paddingLeft
                    }
                    y1={y}
                    x2={
                      width -
                      paddingRight
                    }
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />

                  <text
                    x={
                      paddingLeft -
                      10
                    }
                    y={y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#94a3b8"
                  >
                    {value.toFixed(
                      1,
                    )}
                  </text>
                </g>
              );
            },
          )}

          <line
            x1={paddingLeft}
            y1={baselineY}
            x2={
              width -
              paddingRight
            }
            y2={baselineY}
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="6 5"
          />

          <text
            x={
              width -
              paddingRight
            }
            y={
              baselineY -
              8
            }
            textAnchor="end"
            fontSize="12"
            fontWeight="600"
            fill="#64748b"
          >
            Base 100
          </text>

          {chartData.series.map(
            (series) => {
              const points =
                series.values
                  .map(
                    (
                      value,
                      index,
                    ) => {
                      const x =
                        paddingLeft +
                        (index /
                          Math.max(
                            series
                              .values
                              .length -
                              1,
                            1,
                          )) *
                          chartWidth;

                      const y =
                        getY(
                          value,
                        );

                      return `${x.toFixed(
                        2,
                      )},${y.toFixed(
                        2,
                      )}`;
                    },
                  )
                  .join(" ");

              return (
                <polyline
                  key={
                    series.symbol
                  }
                  points={points}
                  fill="none"
                  stroke={
                    series.color
                  }
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              );
            },
          )}

          <text
            x={paddingLeft}
            y={
              height - 12
            }
            fontSize="12"
            fill="#94a3b8"
          >
            Start
          </text>

          <text
            x={
              width -
              paddingRight
            }
            y={
              height - 12
            }
            textAnchor="end"
            fontSize="12"
            fill="#94a3b8"
          >
            Latest market session
          </text>
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {chartData.series
          .sort(
            (
              first,
              second,
            ) =>
              second.finalValue -
              first.finalValue,
          )
          .map((series) => {
            const performance =
              series.finalValue -
              100;

            return (
              <div
                key={
                  series.symbol
                }
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      series.color,
                  }}
                />

                <span className="text-xs font-bold text-slate-700">
                  {series.symbol}
                </span>

                <span
                  className={`text-xs font-semibold tabular-nums ${getReturnClassName(
                    performance,
                  )}`}
                >
                  {formatReturn(
                    performance,
                  )}
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
};

const MilestoneCell = ({
  trade,
  sessions,
}: {
  trade: PaperTrade;
  sessions: 5 | 10 | 20;
}) => {
  const milestone =
    sessions === 5
      ? trade.milestone5
      : sessions === 10
        ? trade.milestone10
        : trade.milestone20;

  if (!milestone) {
    const remaining =
      Math.max(
        sessions -
          trade.sessionsElapsed,
        0,
      );

    return (
      <div className="text-right">
        <p className="text-sm font-medium text-slate-400">
          Pending
        </p>

        <p className="mt-1 text-xs text-slate-400">
          {remaining} sessions left
        </p>
      </div>
    );
  }

  return (
    <div className="text-right">
      <p
        className={`text-sm font-bold tabular-nums ${getReturnClassName(
          milestone.returnPct,
        )}`}
      >
        {formatReturn(
          milestone.returnPct,
        )}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {formatDate(
          milestone.date,
        )}
      </p>
    </div>
  );
};

const TradingLab = () => {
  const watchlist =
    useTradingLabStore(
      (state) =>
        state.watchlist,
    );

  const paperTrades =
    useTradingLabStore(
      (state) =>
        state.paperTrades,
    );

  const lastTrackingUpdateAt =
    useTradingLabStore(
      (state) =>
        state.lastTrackingUpdateAt,
    );

  const updateStatus =
    useTradingLabStore(
      (state) =>
        state.updateStatus,
    );

  const updateError =
    useTradingLabStore(
      (state) =>
        state.updateError,
    );

  const updateCompletedCount =
    useTradingLabStore(
      (state) =>
        state.updateCompletedCount,
    );

  const updateTotalCount =
    useTradingLabStore(
      (state) =>
        state.updateTotalCount,
    );

  const trackingNextRetryAt =
    useTradingLabStore(
      (state) =>
        state.nextRetryAt,
    );

  const removeFromWatchlist =
    useTradingLabStore(
      (state) =>
        state.removeFromWatchlist,
    );

  const closePaperTrade =
    useTradingLabStore(
      (state) =>
        state.closePaperTrade,
    );

  const deletePaperTrade =
    useTradingLabStore(
      (state) =>
        state.deletePaperTrade,
    );

  const updatePaperTracking =
    useTradingLabStore(
      (state) =>
        state.updatePaperTracking,
    );

  const clearTradingLab =
    useTradingLabStore(
      (state) =>
        state.clearTradingLab,
    );

  const trends =
    useWatchlistTrendStore(
      (state) =>
        state.trends,
    );

  const trendsLastUpdatedAt =
    useWatchlistTrendStore(
      (state) =>
        state.lastUpdatedAt,
    );

  const trendUpdateStatus =
    useWatchlistTrendStore(
      (state) =>
        state.updateStatus,
    );

  const trendUpdateError =
    useWatchlistTrendStore(
      (state) =>
        state.updateError,
    );

  const trendCompletedCount =
    useWatchlistTrendStore(
      (state) =>
        state.updateCompletedCount,
    );

  const trendTotalCount =
    useWatchlistTrendStore(
      (state) =>
        state.updateTotalCount,
    );

  const trendNextRetryAt =
    useWatchlistTrendStore(
      (state) =>
        state.nextRetryAt,
    );

  const updateWatchlistTrends =
    useWatchlistTrendStore(
      (state) =>
        state.updateWatchlistTrends,
    );

  const clearWatchlistTrends =
    useWatchlistTrendStore(
      (state) =>
        state.clearWatchlistTrends,
    );

  const [
    feedback,
    setFeedback,
  ] =
    useState<FeedbackMessage | null>(
      null,
    );

  const [
    currentTime,
    setCurrentTime,
  ] = useState(Date.now());

  const [
    comparisonPeriod,
    setComparisonPeriod,
  ] =
    useState<ComparisonPeriod>(
      63,
    );

  const activeTrades =
    useMemo(
      () =>
        paperTrades.filter(
          (trade) =>
            trade.status ===
            "active",
        ),
      [paperTrades],
    );

  const closedTrades =
    useMemo(
      () =>
        paperTrades.filter(
          (trade) =>
            trade.status ===
            "closed",
        ),
      [paperTrades],
    );

  const averageActiveReturn =
    useMemo(() => {
      if (
        activeTrades.length ===
        0
      ) {
        return 0;
      }

      return (
        activeTrades.reduce(
          (total, trade) =>
            total +
            trade.currentReturnPct,
          0,
        ) /
        activeTrades.length
      );
    }, [activeTrades]);

  const completed20SessionTrades =
    useMemo(
      () =>
        paperTrades.filter(
          (trade) =>
            trade.milestone20 !==
            null,
        ).length,
      [paperTrades],
    );

  const watchlistTrends =
    useMemo(
      () =>
        watchlist
          .map(
            (item) =>
              trends[
                item.symbol
              ],
          )
          .filter(
            (
              trend,
            ): trend is WatchlistTrendResult =>
              Boolean(trend),
          ),
      [watchlist, trends],
    );

  const trendCounts =
    useMemo(() => {
      return watchlistTrends.reduce(
        (
          totals,
          trend,
        ) => {
          if (
            trend.trend ===
            "Bullish"
          ) {
            totals.bullish += 1;
          } else if (
            trend.trend ===
            "Bearish"
          ) {
            totals.bearish += 1;
          } else {
            totals.sideways += 1;
          }

          return totals;
        },
        {
          bullish: 0,
          sideways: 0,
          bearish: 0,
        },
      );
    }, [watchlistTrends]);

  useEffect(() => {
    if (
      !trackingNextRetryAt &&
      !trendNextRetryAt
    ) {
      return;
    }

    const intervalId =
      window.setInterval(() => {
        setCurrentTime(
          Date.now(),
        );
      }, 1_000);

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    trackingNextRetryAt,
    trendNextRetryAt,
  ]);

  const trackingRetryText =
    getRetryText(
      trackingNextRetryAt,
      currentTime,
    );

  const trendRetryText =
    getRetryText(
      trendNextRetryAt,
      currentTime,
    );

  const isUpdatingTracking =
    updateStatus ===
      "updating" ||
    updateStatus ===
      "waiting";

  const isUpdatingTrends =
    trendUpdateStatus ===
      "updating" ||
    trendUpdateStatus ===
      "waiting";

  const trackingProgress =
    updateTotalCount > 0
      ? Math.min(
          (updateCompletedCount /
            updateTotalCount) *
            100,
          100,
        )
      : 0;

  const trendProgress =
    trendTotalCount > 0
      ? Math.min(
          (trendCompletedCount /
            trendTotalCount) *
            100,
          100,
        )
      : 0;

  const handleCloseTrade = (
    tradeId: string,
  ) => {
    const result =
      closePaperTrade(
        tradeId,
      );

    setFeedback({
      type: result.success
        ? "success"
        : "error",

      text: result.message,
    });
  };

  const handleDeleteTrade = (
    trade: PaperTrade,
  ) => {
    const confirmed =
      window.confirm(
        `Delete the ${trade.symbol} paper trade from Trading Lab?`,
      );

    if (!confirmed) {
      return;
    }

    deletePaperTrade(
      trade.id,
    );

    setFeedback({
      type: "success",
      text: `${trade.symbol} was removed from Paper Tracking.`,
    });
  };

  const handleRemoveFromWatchlist = (
    item: WatchlistItem,
  ) => {
    const confirmed =
      window.confirm(
        `Remove ${item.symbol} from your Watchlist?`,
      );

    if (!confirmed) {
      return;
    }

    removeFromWatchlist(
      item.symbol,
    );

    if (
      watchlist.length ===
      1
    ) {
      clearWatchlistTrends();
    }

    setFeedback({
      type: "success",
      text: `${item.symbol} was removed from your Watchlist.`,
    });
  };

  const handleClearTradingLab =
    () => {
      const confirmed =
        window.confirm(
          "Clear the complete Trading Lab watchlist, trend history and paper-trade history?",
        );

      if (!confirmed) {
        return;
      }

      clearTradingLab();
      clearWatchlistTrends();

      setFeedback({
        type: "success",
        text: "Trading Lab was cleared.",
      });
    };

  const handleUpdateTrends =
    () => {
      const symbols =
        watchlist.map(
          (item) =>
            item.symbol,
        );

      void updateWatchlistTrends(
        symbols,
      );
    };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <FlaskConical className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  JIS Trading Lab
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Watchlist, Trends &
                  Paper Tracking
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
              Follow Market Radar
              opportunities, compare
              their price evolution and
              test simulated trades
              without changing your
              real investment portfolio.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {(watchlist.length >
              0 ||
              paperTrades.length >
                0) && (
              <button
                type="button"
                disabled={
                  isUpdatingTracking ||
                  isUpdatingTrends
                }
                onClick={
                  handleClearTradingLab
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />

                Clear Lab
              </button>
            )}

            <button
              type="button"
              disabled={
                isUpdatingTrends ||
                watchlist.length ===
                  0
              }
              onClick={
                handleUpdateTrends
              }
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LineChart
                className={`h-4 w-4 ${
                  trendUpdateStatus ===
                  "updating"
                    ? "animate-pulse"
                    : ""
                }`}
              />

              {trendUpdateStatus ===
              "updating"
                ? "Updating trends"
                : trendUpdateStatus ===
                    "waiting"
                  ? "Waiting for API"
                  : "Update trends"}
            </button>

            <button
              type="button"
              disabled={
                isUpdatingTracking ||
                activeTrades.length ===
                  0
              }
              onClick={() => {
                void updatePaperTracking();
              }}
              className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  updateStatus ===
                  "updating"
                    ? "animate-spin"
                    : ""
                }`}
              />

              {updateStatus ===
              "updating"
                ? "Updating trades"
                : updateStatus ===
                    "waiting"
                  ? "Waiting for API"
                  : "Update tracking"}
            </button>
          </div>
        </div>

        <div className="border-t border-violet-100 bg-violet-50 px-6 py-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />

            <p className="text-xs leading-5 text-violet-800">
              Watchlist Trends uses
              historical market prices.
              Paper Tracking remains a
              simulation and excludes
              commissions, spreads,
              taxes, dividends,
              slippage and execution
              differences.
            </p>
          </div>
        </div>
      </section>

      {feedback && (
        <section
          className={`rounded-2xl border p-4 ${
            feedback.type ===
            "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex gap-3">
            {feedback.type ===
            "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}

            <p className="text-sm leading-6">
              {feedback.text}
            </p>
          </div>
        </section>
      )}

      {isUpdatingTrends && (
        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {trendUpdateStatus ===
                "waiting"
                  ? "Waiting for API credits"
                  : "Updating Watchlist Trends"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {
                  trendCompletedCount
                }{" "}
                of{" "}
                {
                  trendTotalCount
                }{" "}
                Watchlist symbols
                processed.
              </p>
            </div>

            {trendRetryText && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                <Clock3 className="h-4 w-4" />

                Continues in{" "}
                {trendRetryText}
              </div>
            )}
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${trendProgress}%`,
              }}
            />
          </div>
        </section>
      )}

      {trendUpdateError && (
        <section
          className={`rounded-2xl border p-4 ${
            trendUpdateStatus ===
            "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-amber-100 bg-amber-50 text-amber-700"
          }`}
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <p className="text-sm leading-6">
              {trendUpdateError}
            </p>
          </div>
        </section>
      )}

      {isUpdatingTracking && (
        <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-900">
                {updateStatus ===
                "waiting"
                  ? "Waiting for API credits"
                  : "Updating Paper Tracking"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {
                  updateCompletedCount
                }{" "}
                of{" "}
                {
                  updateTotalCount
                }{" "}
                active trades processed.
              </p>
            </div>

            {trackingRetryText && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                <Clock3 className="h-4 w-4" />

                Continues in{" "}
                {trackingRetryText}
              </div>
            )}
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-500"
              style={{
                width: `${trackingProgress}%`,
              }}
            />
          </div>
        </section>
      )}

      {updateError && (
        <section
          className={`rounded-2xl border p-4 ${
            updateStatus ===
            "error"
              ? "border-red-100 bg-red-50 text-red-700"
              : "border-amber-100 bg-amber-50 text-amber-700"
          }`}
        >
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <p className="text-sm leading-6">
              {updateError}
            </p>
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Watchlist"
          value={`${watchlist.length}`}
          description={`${watchlistTrends.length} symbols with historical trends.`}
          icon={
            <Bookmark className="h-5 w-5" />
          }
        />

        <SummaryCard
          title="Bullish trends"
          value={`${trendCounts.bullish}`}
          description={`${trendCounts.sideways} sideways · ${trendCounts.bearish} bearish.`}
          valueClassName={
            trendCounts.bullish >
            0
              ? "text-emerald-600"
              : "text-slate-900"
          }
          icon={
            <TrendingUp className="h-5 w-5" />
          }
        />

        <SummaryCard
          title="Active paper trades"
          value={`${activeTrades.length}`}
          description={`Average return ${formatReturn(
            averageActiveReturn,
          )}.`}
          valueClassName={getReturnClassName(
            averageActiveReturn,
          )}
          icon={
            <Target className="h-5 w-5" />
          }
        />

        <SummaryCard
          title="20-session results"
          value={`${completed20SessionTrades}`}
          description={`Trends updated: ${formatDateTime(
            trendsLastUpdatedAt,
          )}`}
          icon={
            <Clock3 className="h-5 w-5" />
          }
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Watchlist performance
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Base 100 comparison
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-400">
              Every stock starts at
              100 so their percentage
              evolution can be compared
              despite different share
              prices.
            </p>
          </div>

          <div className="inline-flex self-start rounded-xl border border-slate-200 bg-slate-50 p-1">
            {comparisonPeriodOptions.map(
              (option) => (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  onClick={() => {
                    setComparisonPeriod(
                      option.value,
                    );
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    comparisonPeriod ===
                    option.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="p-5">
          <WatchlistComparisonChart
            trends={
              watchlistTrends
            }
            period={
              comparisonPeriod
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-sm font-medium text-slate-500">
            Research list
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Watchlist Trends
          </h2>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Price evolution, moving
            averages and performance
            since the original Market
            Radar signal.
          </p>
        </div>

        {watchlist.length ===
        0 ? (
          <div className="flex min-h-60 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="max-w-md">
              <Bookmark className="mx-auto h-9 w-9 text-slate-300" />

              <h3 className="mt-4 font-semibold text-slate-900">
                Your Watchlist is empty
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Open Market Radar,
                select a company and
                use Add to watchlist.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {watchlist.map(
              (item) => (
                <WatchlistTrendCard
                  key={item.id}
                  item={item}
                  trend={
                    trends[
                      item.symbol
                    ]
                  }
                  onRemove={() => {
                    handleRemoveFromWatchlist(
                      item,
                    );
                  }}
                />
              ),
            )}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <p className="text-sm font-medium text-slate-500">
            Simulated positions
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Active Paper Tracking
          </h2>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Results are measured using
            actual US market sessions
            after the original Radar
            signal.
          </p>
        </div>

        {activeTrades.length ===
        0 ? (
          <div className="flex min-h-56 items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <FlaskConical className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 font-semibold text-slate-900">
                No active paper trades
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Open Market Radar,
                select an opportunity
                and press Start Paper
                Tracking.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Stock
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Entry
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Return
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sessions
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    5 sessions
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    10 sessions
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    20 sessions
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {activeTrades.map(
                  (trade) => (
                    <tr
                      key={
                        trade.id
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">
                          {
                            trade.symbol
                          }
                        </p>

                        <p className="mt-1 max-w-52 truncate text-xs text-slate-400">
                          {
                            trade.name
                          }
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                            Score{" "}
                            {
                              trade.scoreAtEntry
                            }
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getRiskClassName(
                              trade.riskAtEntry,
                            )}`}
                          >
                            {
                              trade.riskAtEntry
                            }
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">
                          {moneyFormatter.format(
                            trade.entryPrice,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            trade.entryMarketDate ??
                              trade.entryDate,
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-bold text-slate-900 tabular-nums">
                          {moneyFormatter.format(
                            trade.currentPrice,
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            trade.marketDate,
                          )}
                        </p>
                      </td>

                      <td
                        className={`px-5 py-4 text-right text-sm font-bold tabular-nums ${getReturnClassName(
                          trade.currentReturnPct,
                        )}`}
                      >
                        {formatReturn(
                          trade.currentReturnPct,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-600 tabular-nums">
                        {
                          trade.sessionsElapsed
                        }
                      </td>

                      <td className="px-5 py-4">
                        <MilestoneCell
                          trade={trade}
                          sessions={5}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <MilestoneCell
                          trade={trade}
                          sessions={10}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <MilestoneCell
                          trade={trade}
                          sessions={20}
                        />
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            handleCloseTrade(
                              trade.id,
                            );
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />

                          Close trade
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {closedTrades.length >
        0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <p className="text-sm font-medium text-slate-500">
              Completed simulations
            </p>

            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              Closed Paper Trades
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Stock
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Entry
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Exit
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Result
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sessions
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Closed
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {closedTrades.map(
                  (trade) => {
                    const finalReturn =
                      trade.closedReturnPct ??
                      trade.currentReturnPct;

                    const finalPrice =
                      trade.closedPrice ??
                      trade.currentPrice;

                    return (
                      <tr
                        key={
                          trade.id
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {
                              trade.symbol
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {
                              trade.setupAtEntry
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700 tabular-nums">
                          {moneyFormatter.format(
                            trade.entryPrice,
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700 tabular-nums">
                          {moneyFormatter.format(
                            finalPrice,
                          )}
                        </td>

                        <td
                          className={`px-5 py-4 text-right text-sm font-bold tabular-nums ${getReturnClassName(
                            finalReturn,
                          )}`}
                        >
                          {formatReturn(
                            finalReturn,
                          )}
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-600 tabular-nums">
                          {
                            trade.sessionsElapsed
                          }
                        </td>

                        <td className="px-5 py-4 text-right text-sm text-slate-500">
                          {formatDate(
                            trade.closedAt,
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteTrade(
                                trade,
                              );
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />

                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs leading-5 text-slate-400">
          Watchlist Trends uses
          split-adjusted historical
          closing prices. The Base 100
          chart compares price
          performance only and does not
          include dividends, taxes,
          commissions or trading costs.
          Last Paper Tracking update:{" "}
          {formatDateTime(
            lastTrackingUpdateAt,
          )}.
        </p>
      </section>
    </div>
  );
};

export default TradingLab;