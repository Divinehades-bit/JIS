import {
  create,
} from "zustand";

import {
  WatchlistTrendRequestError,
  fetchWatchlistTrendBatch,
  type WatchlistTrendResult,
} from "../services/watchlistTrendService";

export type WatchlistTrendUpdateStatus =
  | "idle"
  | "updating"
  | "waiting"
  | "success"
  | "error";

type SavedWatchlistTrendData = {
  trends:
    Record<
      string,
      WatchlistTrendResult
    >;

  lastUpdatedAt:
    string | null;
};

type WatchlistTrendStore = {
  trends:
    Record<
      string,
      WatchlistTrendResult
    >;

  lastUpdatedAt:
    string | null;

  updateStatus:
    WatchlistTrendUpdateStatus;

  updateError:
    string | null;

  updateCompletedCount:
    number;

  updateTotalCount:
    number;

  nextRetryAt:
    string | null;

  updateWatchlistTrends: (
    symbols: string[],
  ) => Promise<void>;

  clearWatchlistTrends:
    () => void;
};

export const WATCHLIST_TRENDS_STORAGE_KEY =
  "jis-watchlist-trends";

const BATCH_SIZE = 8;

const RATE_LIMIT_WAIT_MS =
  65_000;

const MAX_RATE_LIMIT_RETRIES =
  3;

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
};

const isFiniteNumber = (
  value: unknown,
): value is number => {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
};

const isNullableNumber = (
  value: unknown,
): value is number | null => {
  return (
    value === null ||
    isFiniteNumber(value)
  );
};

const isValidTrendPoint = (
  value: unknown,
): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.date ===
      "string" &&
    isFiniteNumber(
      value.close,
    ) &&
    value.close > 0
  );
};

const isValidSavedTrend = (
  value: unknown,
): value is WatchlistTrendResult => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.symbol ===
      "string" &&
    isFiniteNumber(
      value.currentPrice,
    ) &&
    typeof value.latestMarketDate ===
      "string" &&
    isNullableNumber(
      value.change1mPct,
    ) &&
    isNullableNumber(
      value.change3mPct,
    ) &&
    isNullableNumber(
      value.change6mPct,
    ) &&
    isNullableNumber(
      value.change1yPct,
    ) &&
    isFiniteNumber(
      value.sma20,
    ) &&
    isFiniteNumber(
      value.sma50,
    ) &&
    isFiniteNumber(
      value.distanceToSma20Pct,
    ) &&
    isFiniteNumber(
      value.distanceToSma50Pct,
    ) &&
    isFiniteNumber(
      value.high52w,
    ) &&
    isFiniteNumber(
      value.low52w,
    ) &&
    isFiniteNumber(
      value.rangePosition52wPct,
    ) &&
    (value.trend ===
      "Bullish" ||
      value.trend ===
        "Sideways" ||
      value.trend ===
        "Bearish") &&
    Array.isArray(
      value.points,
    ) &&
    value.points.every(
      isValidTrendPoint,
    ) &&
    typeof value.updatedAt ===
      "string"
  );
};

const createDefaultSavedData =
  (): SavedWatchlistTrendData => {
    return {
      trends: {},

      lastUpdatedAt:
        null,
    };
  };

const loadSavedData =
  (): SavedWatchlistTrendData => {
    if (
      typeof window ===
      "undefined"
    ) {
      return createDefaultSavedData();
    }

    try {
      const savedValue =
        localStorage.getItem(
          WATCHLIST_TRENDS_STORAGE_KEY,
        );

      if (!savedValue) {
        return createDefaultSavedData();
      }

      const parsedValue: unknown =
        JSON.parse(
          savedValue,
        );

      if (
        !isRecord(
          parsedValue,
        )
      ) {
        return createDefaultSavedData();
      }

      const trends:
        Record<
          string,
          WatchlistTrendResult
        > = {};

      if (
        isRecord(
          parsedValue.trends,
        )
      ) {
        Object.entries(
          parsedValue.trends,
        ).forEach(
          ([
            symbol,
            trend,
          ]) => {
            if (
              isValidSavedTrend(
                trend,
              )
            ) {
              trends[
                symbol.toUpperCase()
              ] = trend;
            }
          },
        );
      }

      const lastUpdatedAt =
        typeof parsedValue.lastUpdatedAt ===
          "string" &&
        !Number.isNaN(
          new Date(
            parsedValue.lastUpdatedAt,
          ).getTime(),
        )
          ? parsedValue.lastUpdatedAt
          : null;

      return {
        trends,
        lastUpdatedAt,
      };
    } catch (error) {
      console.error(
        "Unable to load Watchlist Trends:",
        error,
      );

      return createDefaultSavedData();
    }
  };

const saveData = (
  data: SavedWatchlistTrendData,
): void => {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      WATCHLIST_TRENDS_STORAGE_KEY,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error(
      "Unable to save Watchlist Trends:",
      error,
    );
  }
};

const removeSavedData =
  (): void => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    try {
      localStorage.removeItem(
        WATCHLIST_TRENDS_STORAGE_KEY,
      );
    } catch (error) {
      console.error(
        "Unable to clear Watchlist Trends:",
        error,
      );
    }
  };

const normalizeSymbols = (
  symbols: string[],
): string[] => {
  return Array.from(
    new Set(
      symbols
        .map((symbol) =>
          symbol
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  );
};

const createBatches = (
  symbols: string[],
): string[][] => {
  const batches:
    string[][] = [];

  for (
    let index = 0;
    index <
    symbols.length;
    index += BATCH_SIZE
  ) {
    batches.push(
      symbols.slice(
        index,
        index +
          BATCH_SIZE,
      ),
    );
  }

  return batches;
};

const wait = (
  milliseconds: number,
): Promise<void> => {
  return new Promise(
    (resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
};

const savedData =
  loadSavedData();

const useWatchlistTrendStore =
  create<WatchlistTrendStore>(
    (set, get) => ({
      trends:
        savedData.trends,

      lastUpdatedAt:
        savedData.lastUpdatedAt,

      updateStatus:
        "idle",

      updateError:
        null,

      updateCompletedCount:
        0,

      updateTotalCount:
        0,

      nextRetryAt:
        null,

      updateWatchlistTrends:
        async (
          rawSymbols,
        ) => {
          const currentStatus =
            get().updateStatus;

          if (
            currentStatus ===
              "updating" ||
            currentStatus ===
              "waiting"
          ) {
            return;
          }

          const symbols =
            normalizeSymbols(
              rawSymbols,
            );

          if (
            symbols.length ===
            0
          ) {
            set({
              updateStatus:
                "error",

              updateError:
                "Your Watchlist is empty.",

              updateCompletedCount:
                0,

              updateTotalCount:
                0,

              nextRetryAt:
                null,
            });

            return;
          }

          set({
            updateStatus:
              "updating",

            updateError:
              null,

            updateCompletedCount:
              0,

            updateTotalCount:
              symbols.length,

            nextRetryAt:
              null,
          });

          const batches =
            createBatches(
              symbols,
            );

          const accumulatedResults:
            Record<
              string,
              WatchlistTrendResult
            > = {};

          const accumulatedErrors:
            Record<string, string> =
              {};

          let latestUpdateAt:
            string | null = null;

          try {
            for (
              let batchIndex = 0;
              batchIndex <
              batches.length;
              batchIndex += 1
            ) {
              const batch =
                batches[
                  batchIndex
                ];

              let retryCount = 0;

              let batchCompleted =
                false;

              while (
                !batchCompleted
              ) {
                try {
                  set({
                    updateStatus:
                      "updating",

                    nextRetryAt:
                      null,
                  });

                  const response =
                    await fetchWatchlistTrendBatch(
                      batch,
                    );

                  latestUpdateAt =
                    response.updatedAt;

                  response.results.forEach(
                    (result) => {
                      accumulatedResults[
                        result.symbol.toUpperCase()
                      ] = result;
                    },
                  );

                  Object.assign(
                    accumulatedErrors,
                    response.errors,
                  );

                  const completedCount =
                    Math.min(
                      (batchIndex +
                        1) *
                        BATCH_SIZE,

                      symbols.length,
                    );

                  set({
                    trends: {
                      ...get()
                        .trends,

                      ...accumulatedResults,
                    },

                    updateCompletedCount:
                      completedCount,
                  });

                  saveData({
                    trends: {
                      ...get()
                        .trends,

                      ...accumulatedResults,
                    },

                    lastUpdatedAt:
                      get()
                        .lastUpdatedAt,
                  });

                  batchCompleted =
                    true;
                } catch (error) {
                  const rateLimited =
                    error instanceof
                      WatchlistTrendRequestError &&
                    error.status ===
                      429;

                  if (
                    rateLimited &&
                    retryCount <
                      MAX_RATE_LIMIT_RETRIES
                  ) {
                    retryCount += 1;

                    const nextRetryAt =
                      new Date(
                        Date.now() +
                          RATE_LIMIT_WAIT_MS,
                      ).toISOString();

                    set({
                      updateStatus:
                        "waiting",

                      updateError:
                        "API credit limit reached. JIS will continue automatically.",

                      nextRetryAt,
                    });

                    await wait(
                      RATE_LIMIT_WAIT_MS,
                    );

                    continue;
                  }

                  const message =
                    error instanceof
                      Error
                      ? error.message
                      : "Unable to update this Watchlist group.";

                  batch.forEach(
                    (symbol) => {
                      accumulatedErrors[
                        symbol
                      ] = message;
                    },
                  );

                  set({
                    updateCompletedCount:
                      Math.min(
                        (batchIndex +
                          1) *
                          BATCH_SIZE,

                        symbols.length,
                      ),
                  });

                  batchCompleted =
                    true;
                }
              }
            }

            const resultCount =
              Object.keys(
                accumulatedResults,
              ).length;

            if (
              resultCount === 0
            ) {
              throw new Error(
                Object.values(
                  accumulatedErrors,
                )[0] ??
                  "No Watchlist Trends could be updated.",
              );
            }

            const finalUpdatedAt =
              latestUpdateAt ??
              new Date().toISOString();

            const finalTrends = {
              ...get().trends,
              ...accumulatedResults,
            };

            /*
             * Retain only symbols that
             * are still in the Watchlist.
             */
            const activeTrendMap =
              symbols.reduce<
                Record<
                  string,
                  WatchlistTrendResult
                >
              >(
                (
                  trendMap,
                  symbol,
                ) => {
                  const trend =
                    finalTrends[
                      symbol
                    ];

                  if (trend) {
                    trendMap[
                      symbol
                    ] = trend;
                  }

                  return trendMap;
                },
                {},
              );

            const errorCount =
              Object.keys(
                accumulatedErrors,
              ).length;

            saveData({
              trends:
                activeTrendMap,

              lastUpdatedAt:
                finalUpdatedAt,
            });

            set({
              trends:
                activeTrendMap,

              lastUpdatedAt:
                finalUpdatedAt,

              updateStatus:
                "success",

              updateError:
                errorCount > 0
                  ? `${errorCount} Watchlist symbols could not be updated.`
                  : null,

              updateCompletedCount:
                symbols.length,

              updateTotalCount:
                symbols.length,

              nextRetryAt:
                null,
            });
          } catch (error) {
            set({
              updateStatus:
                "error",

              updateError:
                error instanceof
                  Error
                  ? error.message
                  : "Unable to update Watchlist Trends.",

              nextRetryAt:
                null,
            });
          }
        },

      clearWatchlistTrends:
        () => {
          removeSavedData();

          set({
            trends: {},

            lastUpdatedAt:
              null,

            updateStatus:
              "idle",

            updateError:
              null,

            updateCompletedCount:
              0,

            updateTotalCount:
              0,

            nextRetryAt:
              null,
          });
        },
    }),
  );

export default useWatchlistTrendStore;