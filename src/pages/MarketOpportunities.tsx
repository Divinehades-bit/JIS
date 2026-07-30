import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  Radar,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import useMarketOpportunityStore, {
  type RankedMarketOpportunity,
} from "../store/marketOpportunityStore";

type SummaryCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
};

type ScoreRowProps = {
  label: string;
  value: number;
  maximum: number;
  negative?: boolean;
};

const moneyFormatter =
  new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

const dateTimeFormatter =
  new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  );

const SummaryCard = ({
  title,
  value,
  description,
  icon,
}: SummaryCardProps) => {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 break-words text-2xl font-bold text-slate-900 tabular-nums">
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

const ScoreRow = ({
  label,
  value,
  maximum,
  negative = false,
}: ScoreRowProps) => {
  const width =
    maximum > 0
      ? Math.min(
          Math.max(
            (value / maximum) *
              100,
            0,
          ),
          100,
        )
      : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-medium text-slate-500">
          {label}
        </p>

        <p
          className={`text-xs font-bold tabular-nums ${
            negative &&
            value > 0
              ? "text-red-600"
              : "text-slate-700"
          }`}
        >
          {negative && value > 0
            ? "-"
            : ""}
          {value}
        </p>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={
            negative
              ? "h-full rounded-full bg-red-400"
              : "h-full rounded-full bg-blue-500"
          }
          style={{
            width: `${width}%`,
          }}
        />
      </div>
    </div>
  );
};

const getScoreClassName = (
  score: number,
) => {
  if (score >= 80) {
    return "bg-emerald-100 text-emerald-700";
  }

  if (score >= 65) {
    return "bg-blue-100 text-blue-700";
  }

  if (score >= 50) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-slate-100 text-slate-600";
};

const getRiskClassName = (
  risk:
    | "Low"
    | "Medium"
    | "High",
) => {
  if (risk === "Low") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (risk === "Medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-red-100 text-red-700";
};

const formatPercentage = (
  value: number,
) => {
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

const getPercentageClassName = (
  value: number,
) => {
  if (value > 0) {
    return "text-emerald-600";
  }

  if (value < 0) {
    return "text-red-600";
  }

  return "text-slate-600";
};

const getRetryText = (
  nextRetryAt: string | null,
  currentTime: number,
) => {
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

const OpportunityDetails = ({
  opportunity,
}: {
  opportunity: RankedMarketOpportunity;
}) => {
  const breakdown =
    opportunity.scoreBreakdown;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">
                {
                  opportunity.symbol
                }
              </h2>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${getScoreClassName(
                  opportunity.score,
                )}`}
              >
                Score{" "}
                {
                  opportunity.score
                }
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskClassName(
                  opportunity.risk,
                )}`}
              >
                {
                  opportunity.risk
                }{" "}
                risk
              </span>
            </div>

            <p className="mt-2 font-medium text-slate-700">
              {opportunity.name}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {
                opportunity.sector
              }{" "}
              ·{" "}
              {
                opportunity.setup
              }
            </p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Latest price
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">
              {moneyFormatter.format(
                opportunity.price,
              )}
            </p>

            <p
              className={`mt-1 text-sm font-semibold tabular-nums ${getPercentageClassName(
                opportunity.change20dPct,
              )}`}
            >
              {formatPercentage(
                opportunity.change20dPct,
              )}{" "}
              over 20 sessions
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">
            10-session momentum
          </p>

          <p
            className={`mt-2 text-lg font-bold tabular-nums ${getPercentageClassName(
              opportunity.change10dPct,
            )}`}
          >
            {formatPercentage(
              opportunity.change10dPct,
            )}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">
            RSI 14
          </p>

          <p className="mt-2 text-lg font-bold text-slate-900 tabular-nums">
            {opportunity.rsi14.toFixed(
              2,
            )}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">
            Volume ratio
          </p>

          <p className="mt-2 text-lg font-bold text-slate-900 tabular-nums">
            {opportunity.volumeRatio.toFixed(
              2,
            )}
            x
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-400">
            Annualized volatility
          </p>

          <p className="mt-2 text-lg font-bold text-slate-900 tabular-nums">
            {opportunity.annualizedVolatilityPct.toFixed(
              2,
            )}
            %
          </p>
        </article>
      </div>

      <div className="grid gap-6 p-5 xl:grid-cols-2">
        <div>
          <h3 className="font-semibold text-slate-900">
            Why it ranked
          </h3>

          <div className="mt-4 space-y-3">
            {opportunity.reasons.map(
              (reason) => (
                <div
                  key={reason}
                  className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4"
                >
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                  <p className="text-sm leading-6 text-emerald-800">
                    {reason}
                  </p>
                </div>
              ),
            )}
          </div>

          {opportunity.warnings
            .length > 0 && (
            <>
              <h3 className="mt-6 font-semibold text-slate-900">
                Risks to review
              </h3>

              <div className="mt-4 space-y-3">
                {opportunity.warnings.map(
                  (warning) => (
                    <div
                      key={
                        warning
                      }
                      className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

                      <p className="text-sm leading-6 text-amber-800">
                        {
                          warning
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            </>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">
                20-day average
              </p>

              <p className="mt-2 font-bold text-slate-900 tabular-nums">
                {moneyFormatter.format(
                  opportunity.sma20,
                )}
              </p>

              <p
                className={`mt-1 text-xs font-medium ${getPercentageClassName(
                  opportunity.distanceToSma20Pct,
                )}`}
              >
                {formatPercentage(
                  opportunity.distanceToSma20Pct,
                )}{" "}
                from price
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">
                50-day average
              </p>

              <p className="mt-2 font-bold text-slate-900 tabular-nums">
                {moneyFormatter.format(
                  opportunity.sma50,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Medium-term trend
                reference
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">
            Score breakdown
          </h3>

          <div className="mt-4 space-y-5 rounded-2xl border border-slate-200 p-5">
            <ScoreRow
              label="Trend"
              value={
                breakdown.trend
              }
              maximum={25}
            />

            <ScoreRow
              label="Momentum"
              value={
                breakdown.momentum
              }
              maximum={20}
            />

            <ScoreRow
              label="Technical setup"
              value={
                breakdown.setup
              }
              maximum={20}
            />

            <ScoreRow
              label="Volume"
              value={
                breakdown.volume
              }
              maximum={15}
            />

            <ScoreRow
              label="RSI position"
              value={
                breakdown.rsi
              }
              maximum={10}
            />

            <ScoreRow
              label="Risk control"
              value={
                breakdown.risk
              }
              maximum={10}
            />

            <ScoreRow
              label="Overextension penalty"
              value={
                breakdown.penalty
              }
              maximum={12}
              negative
            />

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-700">
                Final score
              </p>

              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {
                  opportunity.score
                }
                /100
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Current classification
            </p>

            <p className="mt-2 font-bold text-blue-900">
              {
                opportunity.rating
              }
            </p>

            <p className="mt-2 text-xs leading-5 text-blue-700">
              This classification is
              generated from technical
              market data. It is not a
              guarantee of profit or a
              personalized buy
              recommendation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const MarketOpportunities =
  () => {
    const opportunities =
      useMarketOpportunityStore(
        (state) =>
          state.opportunities,
      );

    const lastScanAt =
      useMarketOpportunityStore(
        (state) =>
          state.lastScanAt,
      );

    const scanStatus =
      useMarketOpportunityStore(
        (state) =>
          state.scanStatus,
      );

    const scanError =
      useMarketOpportunityStore(
        (state) =>
          state.scanError,
      );

    const scanCompletedCount =
      useMarketOpportunityStore(
        (state) =>
          state.scanCompletedCount,
      );

    const scanTotalCount =
      useMarketOpportunityStore(
        (state) =>
          state.scanTotalCount,
      );

    const nextRetryAt =
      useMarketOpportunityStore(
        (state) =>
          state.nextRetryAt,
      );

    const scanMarket =
      useMarketOpportunityStore(
        (state) =>
          state.scanMarket,
      );

    const clearMarketScan =
      useMarketOpportunityStore(
        (state) =>
          state.clearMarketScan,
      );

    const [
      selectedSymbol,
      setSelectedSymbol,
    ] = useState<
      string | null
    >(null);

    const [
      currentTime,
      setCurrentTime,
    ] = useState(
      Date.now(),
    );

    const topOpportunities =
      useMemo(
        () =>
          opportunities.slice(
            0,
            10,
          ),
        [opportunities],
      );

    useEffect(() => {
      if (
        topOpportunities.length ===
        0
      ) {
        setSelectedSymbol(null);

        return;
      }

      const selectedStillExists =
        topOpportunities.some(
          (opportunity) =>
            opportunity.symbol ===
            selectedSymbol,
        );

      if (
        !selectedStillExists
      ) {
        setSelectedSymbol(
          topOpportunities[0]
            .symbol,
        );
      }
    }, [
      topOpportunities,
      selectedSymbol,
    ]);

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

    const selectedOpportunity =
      topOpportunities.find(
        (opportunity) =>
          opportunity.symbol ===
          selectedSymbol,
      ) ??
      topOpportunities[0] ??
      null;

    const topScore =
      topOpportunities[0]
        ?.score ?? 0;

    const progress =
      scanTotalCount > 0
        ? Math.min(
            (scanCompletedCount /
              scanTotalCount) *
              100,
            100,
          )
        : 0;

    const retryText =
      getRetryText(
        nextRetryAt,
        currentTime,
      );

    const isBusy =
      scanStatus ===
        "scanning" ||
      scanStatus === "waiting";

    const formattedLastScan =
      lastScanAt
        ? dateTimeFormatter.format(
            new Date(
              lastScanAt,
            ),
          )
        : "Not scanned yet";

    return (
      <div className="space-y-6">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Radar className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-500">
                    JIS Market Radar
                  </p>

                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Market
                    Opportunities
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
                Scan 30 large and
                liquid US stocks and
                rank the 10 strongest
                technical research
                candidates.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {opportunities.length >
                0 && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={
                    clearMarketScan
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />

                  Clear results
                </button>
              )}

              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  void scanMarket();
                }}
                className="inline-flex min-w-40 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    scanStatus ===
                    "scanning"
                      ? "animate-spin"
                      : ""
                  }`}
                />

                {scanStatus ===
                "scanning"
                  ? "Scanning market"
                  : scanStatus ===
                      "waiting"
                    ? "Waiting for API"
                    : opportunities.length >
                        0
                      ? "Scan again"
                      : "Scan market"}
              </button>
            </div>
          </div>

          <div className="border-t border-blue-100 bg-blue-50 px-6 py-4">
            <div className="flex gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

              <p className="text-xs leading-5 text-blue-800">
                Market Opportunities
                is a research tool, not
                financial advice.
                Scores can change
                quickly and do not
                predict or guarantee a
                future price increase.
              </p>
            </div>
          </div>
        </section>

        {isBusy && (
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {scanStatus ===
                  "waiting"
                    ? "Waiting for API credits"
                    : "Analyzing market data"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {
                    scanCompletedCount
                  }{" "}
                  of{" "}
                  {
                    scanTotalCount
                  }{" "}
                  stocks processed.
                  Keep JIS open until
                  the scan finishes.
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

        {scanError && (
          <section
            className={`rounded-2xl border p-4 ${
              scanStatus === "error"
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-amber-100 bg-amber-50 text-amber-700"
            }`}
          >
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

              <p className="text-sm leading-6">
                {scanError}
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Stocks analyzed"
            value={`${opportunities.length}/${scanTotalCount}`}
            description="Valid technical results currently stored."
            icon={
              <BarChart3 className="h-5 w-5" />
            }
          />

          <SummaryCard
            title="Top score"
            value={`${topScore}/100`}
            description="Highest current research score."
            icon={
              <TrendingUp className="h-5 w-5" />
            }
          />

          <SummaryCard
            title="Top candidates"
            value={`${topOpportunities.length}`}
            description="Companies displayed in the ranking."
            icon={
              <Activity className="h-5 w-5" />
            }
          />

          <SummaryCard
            title="Last scan"
            value={
              lastScanAt
                ? "Completed"
                : "Pending"
            }
            description={
              formattedLastScan
            }
            icon={
              <Clock3 className="h-5 w-5" />
            }
          />
        </section>

        {topOpportunities.length ===
        0 ? (
          <section className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="max-w-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                <Radar className="h-7 w-7" />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-slate-900">
                Market scan not
                started
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Press Scan market.
                JIS will analyze the
                selected universe in
                groups and build your
                Top 10 ranking.
              </p>

              <p className="mt-3 text-xs leading-5 text-slate-400">
                With the current API
                limit, the complete
                scan may take several
                minutes and pause
                automatically between
                groups.
              </p>
            </div>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <p className="text-sm font-medium text-slate-500">
                  Daily ranking
                </p>

                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  Top 10 research
                  candidates
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Select a stock to
                  review the technical
                  reasons and risks
                  behind its score.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[940px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Rank
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Stock
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Score
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Setup
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Price
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        20 sessions
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        RSI
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Risk
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {topOpportunities.map(
                      (
                        opportunity,
                        index,
                      ) => {
                        const isSelected =
                          selectedOpportunity
                            ?.symbol ===
                          opportunity.symbol;

                        return (
                          <tr
                            key={
                              opportunity.symbol
                            }
                            tabIndex={0}
                            role="button"
                            onClick={() => {
                              setSelectedSymbol(
                                opportunity.symbol,
                              );
                            }}
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                  "Enter" ||
                                event.key ===
                                  " "
                              ) {
                                setSelectedSymbol(
                                  opportunity.symbol,
                                );
                              }
                            }}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? "bg-blue-50"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="px-5 py-4">
                              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                                {index +
                                  1}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-bold text-slate-900">
                                {
                                  opportunity.symbol
                                }
                              </p>

                              <p className="mt-1 max-w-48 truncate text-xs text-slate-400">
                                {
                                  opportunity.name
                                }
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getScoreClassName(
                                  opportunity.score,
                                )}`}
                              >
                                {
                                  opportunity.score
                                }
                              </span>
                            </td>

                            <td className="px-5 py-4 text-sm font-medium text-slate-600">
                              {
                                opportunity.setup
                              }
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">
                              {moneyFormatter.format(
                                opportunity.price,
                              )}
                            </td>

                            <td
                              className={`whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums ${getPercentageClassName(
                                opportunity.change20dPct,
                              )}`}
                            >
                              {formatPercentage(
                                opportunity.change20dPct,
                              )}
                            </td>

                            <td className="px-5 py-4 text-right text-sm font-medium text-slate-600 tabular-nums">
                              {opportunity.rsi14.toFixed(
                                1,
                              )}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRiskClassName(
                                  opportunity.risk,
                                )}`}
                              >
                                {
                                  opportunity.risk
                                }
                              </span>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedOpportunity && (
              <OpportunityDetails
                opportunity={
                  selectedOpportunity
                }
              />
            )}
          </>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs leading-5 text-slate-400">
            Scores use recent price,
            trend, momentum, volume,
            RSI and volatility data.
            Company fundamentals,
            earnings announcements,
            news and valuation are not
            yet included. Investigate
            each company independently
            before making a trade.
          </p>
        </section>
      </div>
    );
  };

export default MarketOpportunities;