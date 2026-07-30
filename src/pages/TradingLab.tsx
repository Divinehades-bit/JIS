import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  Clock3,
  FlaskConical,
  RefreshCw,
  Target,
  Trash2,
  TrendingDown,
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
  PaperTrade,
} from "../store/tradingLabStore";

import useTradingLabStore from "../store/tradingLabStore";

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
    Math.abs(value) < 0.005
  ) {
    return "0.00%";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(
    2,
  )}%`;
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

  const nextRetryAt =
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

  useEffect(() => {
    if (!nextRetryAt) {
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
  }, [nextRetryAt]);

  const retryText =
    getRetryText(
      nextRetryAt,
      currentTime,
    );

  const isUpdating =
    updateStatus ===
      "updating" ||
    updateStatus ===
      "waiting";

  const progress =
    updateTotalCount > 0
      ? Math.min(
          (updateCompletedCount /
            updateTotalCount) *
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

  const handleClearTradingLab =
    () => {
      const confirmed =
        window.confirm(
          "Clear the complete Trading Lab watchlist and paper-trade history?",
        );

      if (!confirmed) {
        return;
      }

      clearTradingLab();

      setFeedback({
        type: "success",
        text: "Trading Lab was cleared.",
      });
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
                  Watchlist & Paper Tracking
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
              Follow Market Radar
              opportunities and test
              their performance without
              using real money or
              changing your investment
              portfolio.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {(watchlist.length >
              0 ||
              paperTrades.length >
                0) && (
              <button
                type="button"
                disabled={
                  isUpdating
                }
                onClick={
                  handleClearTradingLab
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />

                Clear Trading Lab
              </button>
            )}

            <button
              type="button"
              disabled={
                isUpdating ||
                activeTrades.length ===
                  0
              }
              onClick={() => {
                void updatePaperTracking();
              }}
              className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
              Paper Tracking is a
              simulation. It excludes
              commissions, spreads,
              taxes, dividends,
              slippage and order
              execution differences.
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

      {isUpdating && (
        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
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
                active trades
                processed.
              </p>
            </div>

            {retryText && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                <Clock3 className="h-4 w-4" />

                Continues in{" "}
                {retryText}
              </div>
            )}
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${progress}%`,
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
          description="Market opportunities saved for research."
          icon={
            <Bookmark className="h-5 w-5" />
          }
        />

        <SummaryCard
          title="Active paper trades"
          value={`${activeTrades.length}`}
          description="Simulated ideas currently being tracked."
          icon={
            <Target className="h-5 w-5" />
          }
        />

        <SummaryCard
          title="Average active return"
          value={formatReturn(
            averageActiveReturn,
          )}
          valueClassName={getReturnClassName(
            averageActiveReturn,
          )}
          description="Simple average of active simulated trades."
          icon={
            averageActiveReturn >=
            0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )
          }
        />

        <SummaryCard
          title="20-session results"
          value={`${completed20SessionTrades}`}
          description={`Last update: ${formatDateTime(
            lastTrackingUpdateAt,
          )}`}
          icon={
            <Clock3 className="h-5 w-5" />
          }
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <p className="text-sm font-medium text-slate-500">
            Research list
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Watchlist
          </h2>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            Stocks saved from Market
            Radar for further
            investigation.
          </p>
        </div>

        {watchlist.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center p-8 text-center">
            <div className="max-w-md">
              <Bookmark className="mx-auto h-9 w-9 text-slate-300" />

              <h3 className="mt-4 font-semibold text-slate-900">
                Your watchlist is empty
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Open Market Radar,
                select a stock and use
                Add to watchlist.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Stock
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Radar price
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Score
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Setup
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Added
                  </th>

                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {watchlist.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-900">
                          {
                            item.symbol
                          }
                        </p>

                        <p className="mt-1 max-w-56 truncate text-xs text-slate-400">
                          {item.name} ·{" "}
                          {
                            item.sector
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">
                        {moneyFormatter.format(
                          item.sourcePrice,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-bold text-blue-600 tabular-nums">
                        {
                          item.sourceScore
                        }
                        /100
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-600">
                        {
                          item.sourceSetup
                        }
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRiskClassName(
                            item.sourceRisk,
                          )}`}
                        >
                          {
                            item.sourceRisk
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-500">
                        {formatDate(
                          item.addedAt,
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            removeFromWatchlist(
                              item.symbol,
                            );

                            setFeedback({
                              type: "success",
                              text: `${item.symbol} was removed from your watchlist.`,
                            });
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />

                          Remove
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
                          trade={
                            trade
                          }
                          sessions={
                            5
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <MilestoneCell
                          trade={
                            trade
                          }
                          sessions={
                            10
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        <MilestoneCell
                          trade={
                            trade
                          }
                          sessions={
                            20
                          }
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
    </div>
  );
};

export default TradingLab;