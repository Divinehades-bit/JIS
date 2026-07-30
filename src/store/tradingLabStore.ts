import { create } from "zustand";

import type {
  OpportunityRisk,
  OpportunitySetup,
} from "../services/marketOpportunityService";

import {
  PaperTrackingRequestError,
  fetchPaperTrackingBatch,
  type PaperTrackingEntryRequest,
  type PaperTrackingMilestone,
} from "../services/paperTrackingService";

import type {
  RankedMarketOpportunity,
} from "./marketOpportunityStore";

export type WatchlistItem = {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  addedAt: string;
  sourcePrice: number;
  sourceScore: number;
  sourceSetup: OpportunitySetup;
  sourceRisk: OpportunityRisk;
  sourceScannedAt: string;
};

export type PaperTradeStatus =
  | "active"
  | "closed";

export type PaperTrade = {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  status: PaperTradeStatus;

  entryDate: string;
  entryMarketDate:
    | string
    | null;

  entryPrice: number;
  scoreAtEntry: number;
  setupAtEntry: OpportunitySetup;
  riskAtEntry: OpportunityRisk;
  createdAt: string;

  currentPrice: number;
  currentReturnPct: number;
  sessionsElapsed: number;
  marketDate: string | null;

  milestone5:
    | PaperTrackingMilestone
    | null;

  milestone10:
    | PaperTrackingMilestone
    | null;

  milestone20:
    | PaperTrackingMilestone
    | null;

  lastUpdatedAt:
    | string
    | null;

  closedAt:
    | string
    | null;

  closedPrice:
    | number
    | null;

  closedReturnPct:
    | number
    | null;
};

export type TradingLabUpdateStatus =
  | "idle"
  | "updating"
  | "waiting"
  | "success"
  | "error";

export type TradingActionResult = {
  success: boolean;
  message: string;
};

type SavedTradingLabData = {
  watchlist: WatchlistItem[];
  paperTrades: PaperTrade[];
  lastTrackingUpdateAt:
    | string
    | null;
};

type TradingLabStore = {
  watchlist: WatchlistItem[];
  paperTrades: PaperTrade[];

  lastTrackingUpdateAt:
    | string
    | null;

  updateStatus:
    TradingLabUpdateStatus;

  updateError:
    | string
    | null;

  updateCompletedCount: number;
  updateTotalCount: number;

  nextRetryAt:
    | string
    | null;

  addToWatchlist: (
    opportunity:
      RankedMarketOpportunity,
  ) => TradingActionResult;

  removeFromWatchlist: (
    symbol: string,
  ) => void;

  startPaperTrade: (
    opportunity:
      RankedMarketOpportunity,
  ) => TradingActionResult;

  closePaperTrade: (
    tradeId: string,
  ) => TradingActionResult;

  deletePaperTrade: (
    tradeId: string,
  ) => void;

  updatePaperTracking:
    () => Promise<void>;

  clearTradingLab: () => void;
};

export const TRADING_LAB_STORAGE_KEY =
  "jis-trading-lab";

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
    value !== null
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

const isNullableString = (
  value: unknown,
): value is string | null => {
  return (
    value === null ||
    typeof value === "string"
  );
};

const isValidRisk = (
  value: unknown,
): value is OpportunityRisk => {
  return (
    value === "Low" ||
    value === "Medium" ||
    value === "High"
  );
};

const isValidSetup = (
  value: unknown,
): value is OpportunitySetup => {
  return (
    value === "Breakout" ||
    value ===
      "Healthy pullback" ||
    value === "Uptrend" ||
    value === "Recovery" ||
    value ===
      "No clear setup"
  );
};

const isValidMilestone = (
  value: unknown,
): value is PaperTrackingMilestone => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.sessions === 5 ||
      value.sessions === 10 ||
      value.sessions === 20) &&
    typeof value.date ===
      "string" &&
    isFiniteNumber(
      value.price,
    ) &&
    isFiniteNumber(
      value.returnPct,
    )
  );
};

const isNullableMilestone = (
  value: unknown,
): value is
  | PaperTrackingMilestone
  | null => {
  return (
    value === null ||
    isValidMilestone(value)
  );
};

const isSavedWatchlistItem = (
  value: unknown,
): value is WatchlistItem => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id ===
      "string" &&
    typeof value.symbol ===
      "string" &&
    typeof value.name ===
      "string" &&
    typeof value.sector ===
      "string" &&
    typeof value.addedAt ===
      "string" &&
    isFiniteNumber(
      value.sourcePrice,
    ) &&
    isFiniteNumber(
      value.sourceScore,
    ) &&
    isValidSetup(
      value.sourceSetup,
    ) &&
    isValidRisk(
      value.sourceRisk,
    ) &&
    typeof value.sourceScannedAt ===
      "string"
  );
};

const isSavedPaperTrade = (
  value: unknown,
): value is PaperTrade => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id ===
      "string" &&
    typeof value.symbol ===
      "string" &&
    typeof value.name ===
      "string" &&
    typeof value.sector ===
      "string" &&
    (value.status ===
      "active" ||
      value.status ===
        "closed") &&
    typeof value.entryDate ===
      "string" &&
    isNullableString(
      value.entryMarketDate,
    ) &&
    isFiniteNumber(
      value.entryPrice,
    ) &&
    isFiniteNumber(
      value.scoreAtEntry,
    ) &&
    isValidSetup(
      value.setupAtEntry,
    ) &&
    isValidRisk(
      value.riskAtEntry,
    ) &&
    typeof value.createdAt ===
      "string" &&
    isFiniteNumber(
      value.currentPrice,
    ) &&
    isFiniteNumber(
      value.currentReturnPct,
    ) &&
    isFiniteNumber(
      value.sessionsElapsed,
    ) &&
    isNullableString(
      value.marketDate,
    ) &&
    isNullableMilestone(
      value.milestone5,
    ) &&
    isNullableMilestone(
      value.milestone10,
    ) &&
    isNullableMilestone(
      value.milestone20,
    ) &&
    isNullableString(
      value.lastUpdatedAt,
    ) &&
    isNullableString(
      value.closedAt,
    ) &&
    isNullableNumber(
      value.closedPrice,
    ) &&
    isNullableNumber(
      value.closedReturnPct,
    )
  );
};

const createDefaultSavedData =
  (): SavedTradingLabData => {
    return {
      watchlist: [],
      paperTrades: [],

      lastTrackingUpdateAt:
        null,
    };
  };

const loadSavedData =
  (): SavedTradingLabData => {
    if (
      typeof window ===
      "undefined"
    ) {
      return createDefaultSavedData();
    }

    try {
      const savedValue =
        localStorage.getItem(
          TRADING_LAB_STORAGE_KEY,
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

      const watchlist =
        Array.isArray(
          parsedValue.watchlist,
        )
          ? parsedValue.watchlist.filter(
              isSavedWatchlistItem,
            )
          : [];

      const paperTrades =
        Array.isArray(
          parsedValue.paperTrades,
        )
          ? parsedValue.paperTrades.filter(
              isSavedPaperTrade,
            )
          : [];

      const lastTrackingUpdateAt =
        isNullableString(
          parsedValue.lastTrackingUpdateAt,
        )
          ? parsedValue.lastTrackingUpdateAt
          : null;

      return {
        watchlist,
        paperTrades,
        lastTrackingUpdateAt,
      };
    } catch (error) {
      console.error(
        "Unable to load Trading Lab:",
        error,
      );

      return createDefaultSavedData();
    }
  };

const saveData = (
  data: SavedTradingLabData,
): void => {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      TRADING_LAB_STORAGE_KEY,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error(
      "Unable to save Trading Lab:",
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
        TRADING_LAB_STORAGE_KEY,
      );
    } catch (error) {
      console.error(
        "Unable to clear Trading Lab:",
        error,
      );
    }
  };

const createId = (
  prefix: string,
): string => {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

const normalizeSymbol = (
  symbol: string,
): string => {
  return symbol
    .trim()
    .toUpperCase();
};

const getOpportunityDate = (
  scannedAt: string,
): string => {
  const parsedDate =
    new Date(scannedAt);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return new Date()
      .toISOString()
      .slice(0, 10);
  }

  return scannedAt.slice(
    0,
    10,
  );
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

const createBatches = <T,>(
  values: T[],
  batchSize: number,
): T[][] => {
  const batches: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += batchSize
  ) {
    batches.push(
      values.slice(
        index,
        index + batchSize,
      ),
    );
  }

  return batches;
};

const persistCurrentState = (
  state: Pick<
    TradingLabStore,
    | "watchlist"
    | "paperTrades"
    | "lastTrackingUpdateAt"
  >,
): void => {
  saveData({
    watchlist:
      state.watchlist,

    paperTrades:
      state.paperTrades,

    lastTrackingUpdateAt:
      state.lastTrackingUpdateAt,
  });
};

const savedData =
  loadSavedData();

const useTradingLabStore =
  create<TradingLabStore>(
    (set, get) => ({
      watchlist:
        savedData.watchlist,

      paperTrades:
        savedData.paperTrades,

      lastTrackingUpdateAt:
        savedData.lastTrackingUpdateAt,

      updateStatus: "idle",
      updateError: null,

      updateCompletedCount: 0,
      updateTotalCount: 0,

      nextRetryAt: null,

      addToWatchlist: (
        opportunity,
      ) => {
        const symbol =
          normalizeSymbol(
            opportunity.symbol,
          );

        const alreadyExists =
          get().watchlist.some(
            (item) =>
              item.symbol ===
              symbol,
          );

        if (alreadyExists) {
          return {
            success: false,

            message:
              `${symbol} is already in your watchlist.`,
          };
        }

        const newItem:
          WatchlistItem = {
            id: createId(
              "watch",
            ),

            symbol,
            name:
              opportunity.name,

            sector:
              opportunity.sector,

            addedAt:
              new Date().toISOString(),

            sourcePrice:
              opportunity.price,

            sourceScore:
              opportunity.score,

            sourceSetup:
              opportunity.setup,

            sourceRisk:
              opportunity.risk,

            sourceScannedAt:
              opportunity.scannedAt,
          };

        set((state) => {
          const nextState = {
            ...state,

            watchlist: [
              newItem,
              ...state.watchlist,
            ],
          };

          persistCurrentState(
            nextState,
          );

          return {
            watchlist:
              nextState.watchlist,
          };
        });

        return {
          success: true,

          message:
            `${symbol} was added to your watchlist.`,
        };
      },

      removeFromWatchlist: (
        symbol,
      ) => {
        const normalizedSymbol =
          normalizeSymbol(
            symbol,
          );

        set((state) => {
          const nextState = {
            ...state,

            watchlist:
              state.watchlist.filter(
                (item) =>
                  item.symbol !==
                  normalizedSymbol,
              ),
          };

          persistCurrentState(
            nextState,
          );

          return {
            watchlist:
              nextState.watchlist,
          };
        });
      },

      startPaperTrade: (
        opportunity,
      ) => {
        const symbol =
          normalizeSymbol(
            opportunity.symbol,
          );

        const activeTradeExists =
          get().paperTrades.some(
            (trade) =>
              trade.symbol ===
                symbol &&
              trade.status ===
                "active",
          );

        if (
          activeTradeExists
        ) {
          return {
            success: false,

            message:
              `${symbol} already has an active paper trade.`,
          };
        }

        const now =
          new Date().toISOString();

        const paperTrade:
          PaperTrade = {
            id: createId(
              "paper",
            ),

            symbol,
            name:
              opportunity.name,

            sector:
              opportunity.sector,

            status: "active",

            entryDate:
              getOpportunityDate(
                opportunity.scannedAt,
              ),

            entryMarketDate:
              null,

            entryPrice:
              opportunity.price,

            scoreAtEntry:
              opportunity.score,

            setupAtEntry:
              opportunity.setup,

            riskAtEntry:
              opportunity.risk,

            createdAt: now,

            currentPrice:
              opportunity.price,

            currentReturnPct: 0,
            sessionsElapsed: 0,

            marketDate: null,

            milestone5: null,
            milestone10: null,
            milestone20: null,

            lastUpdatedAt:
              null,

            closedAt: null,
            closedPrice: null,

            closedReturnPct:
              null,
          };

        set((state) => {
          const watchlistExists =
            state.watchlist.some(
              (item) =>
                item.symbol ===
                symbol,
            );

          const nextWatchlist =
            watchlistExists
              ? state.watchlist
              : [
                  {
                    id: createId(
                      "watch",
                    ),

                    symbol,

                    name:
                      opportunity.name,

                    sector:
                      opportunity.sector,

                    addedAt: now,

                    sourcePrice:
                      opportunity.price,

                    sourceScore:
                      opportunity.score,

                    sourceSetup:
                      opportunity.setup,

                    sourceRisk:
                      opportunity.risk,

                    sourceScannedAt:
                      opportunity.scannedAt,
                  },

                  ...state.watchlist,
                ];

          const nextState = {
            ...state,

            watchlist:
              nextWatchlist,

            paperTrades: [
              paperTrade,
              ...state.paperTrades,
            ],
          };

          persistCurrentState(
            nextState,
          );

          return {
            watchlist:
              nextWatchlist,

            paperTrades:
              nextState.paperTrades,
          };
        });

        return {
          success: true,

          message:
            `Paper Tracking started for ${symbol} at $${opportunity.price.toFixed(
              2,
            )}.`,
        };
      },

      closePaperTrade: (
        tradeId,
      ) => {
        const trade =
          get().paperTrades.find(
            (item) =>
              item.id ===
              tradeId,
          );

        if (!trade) {
          return {
            success: false,

            message:
              "Paper trade not found.",
          };
        }

        if (
          trade.status ===
          "closed"
        ) {
          return {
            success: false,

            message:
              `${trade.symbol} is already closed.`,
          };
        }

        const closedAt =
          new Date().toISOString();

        set((state) => {
          const nextState = {
            ...state,

            paperTrades:
              state.paperTrades.map(
                (item) =>
                  item.id ===
                  tradeId
                    ? {
                        ...item,

                        status:
                          "closed" as const,

                        closedAt,

                        closedPrice:
                          item.currentPrice,

                        closedReturnPct:
                          item.currentReturnPct,
                      }
                    : item,
              ),
          };

          persistCurrentState(
            nextState,
          );

          return {
            paperTrades:
              nextState.paperTrades,
          };
        });

        return {
          success: true,

          message:
            `${trade.symbol} paper trade was closed at ${trade.currentReturnPct.toFixed(
              2,
            )}%.`,
        };
      },

      deletePaperTrade: (
        tradeId,
      ) => {
        set((state) => {
          const nextState = {
            ...state,

            paperTrades:
              state.paperTrades.filter(
                (trade) =>
                  trade.id !==
                  tradeId,
              ),
          };

          persistCurrentState(
            nextState,
          );

          return {
            paperTrades:
              nextState.paperTrades,
          };
        });
      },

      updatePaperTracking:
        async () => {
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

          const activeTrades =
            get().paperTrades.filter(
              (trade) =>
                trade.status ===
                "active",
            );

          if (
            activeTrades.length ===
            0
          ) {
            set({
              updateStatus:
                "error",

              updateError:
                "There are no active paper trades to update.",

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

            updateError: null,

            updateCompletedCount:
              0,

            updateTotalCount:
              activeTrades.length,

            nextRetryAt: null,
          });

          const requests:
            PaperTrackingEntryRequest[] =
              activeTrades.map(
                (trade) => ({
                  id: trade.id,

                  symbol:
                    trade.symbol,

                  entryDate:
                    trade.entryDate,

                  entryPrice:
                    trade.entryPrice,
                }),
              );

          const batches =
            createBatches(
              requests,
              BATCH_SIZE,
            );

          const accumulatedErrors:
            Record<string, string> =
              {};

          let latestUpdateAt:
            | string
            | null = null;

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
                    await fetchPaperTrackingBatch(
                      batch,
                    );

                  latestUpdateAt =
                    response.updatedAt;

                  Object.assign(
                    accumulatedErrors,
                    response.errors,
                  );

                  const resultMap =
                    new Map(
                      response.results.map(
                        (result) => [
                          result.id,
                          result,
                        ],
                      ),
                    );

                  set((state) => {
                    const nextState = {
                      ...state,

                      paperTrades:
                        state.paperTrades.map(
                          (trade) => {
                            const result =
                              resultMap.get(
                                trade.id,
                              );

                            if (
                              !result ||
                              trade.status !==
                                "active"
                            ) {
                              return trade;
                            }

                            return {
                              ...trade,

                              entryMarketDate:
                                result.entryMarketDate,

                              currentPrice:
                                result.currentPrice,

                              currentReturnPct:
                                result.currentReturnPct,

                              sessionsElapsed:
                                result.sessionsElapsed,

                              marketDate:
                                result.marketDate,

                              milestone5:
                                result.milestone5,

                              milestone10:
                                result.milestone10,

                              milestone20:
                                result.milestone20,

                              lastUpdatedAt:
                                result.updatedAt,
                            };
                          },
                        ),

                      lastTrackingUpdateAt:
                        response.updatedAt,
                    };

                    persistCurrentState(
                      nextState,
                    );

                    return {
                      paperTrades:
                        nextState.paperTrades,

                      lastTrackingUpdateAt:
                        nextState.lastTrackingUpdateAt,
                    };
                  });

                  const completedCount =
                    Math.min(
                      (batchIndex +
                        1) *
                        BATCH_SIZE,

                      activeTrades.length,
                    );

                  set({
                    updateCompletedCount:
                      completedCount,
                  });

                  batchCompleted =
                    true;
                } catch (error) {
                  const rateLimited =
                    error instanceof
                      PaperTrackingRequestError &&
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
                      : "Unable to update this paper tracking group.";

                  batch.forEach(
                    (entry) => {
                      accumulatedErrors[
                        entry.symbol
                      ] = message;
                    },
                  );

                  set({
                    updateCompletedCount:
                      Math.min(
                        (batchIndex +
                          1) *
                          BATCH_SIZE,

                        activeTrades.length,
                      ),
                  });

                  batchCompleted =
                    true;
                }
              }
            }

            const errorCount =
              Object.keys(
                accumulatedErrors,
              ).length;

            if (
              errorCount ===
              activeTrades.length
            ) {
              throw new Error(
                Object.values(
                  accumulatedErrors,
                )[0] ??
                  "No paper trades could be updated.",
              );
            }

            const finalUpdateAt =
              latestUpdateAt ??
              new Date().toISOString();

            set((state) => {
              const nextState = {
                ...state,

                lastTrackingUpdateAt:
                  finalUpdateAt,
              };

              persistCurrentState(
                nextState,
              );

              return {
                updateStatus:
                  "success",

                updateError:
                  errorCount > 0
                    ? `${errorCount} paper trades could not be updated.`
                    : null,

                updateCompletedCount:
                  activeTrades.length,

                lastTrackingUpdateAt:
                  finalUpdateAt,

                nextRetryAt:
                  null,
              };
            });
          } catch (error) {
            set({
              updateStatus:
                "error",

              updateError:
                error instanceof
                  Error
                  ? error.message
                  : "Unable to update Paper Tracking.",

              nextRetryAt:
                null,
            });
          }
        },

      clearTradingLab: () => {
        removeSavedData();

        set({
          watchlist: [],
          paperTrades: [],

          lastTrackingUpdateAt:
            null,

          updateStatus: "idle",
          updateError: null,

          updateCompletedCount:
            0,

          updateTotalCount: 0,
          nextRetryAt: null,
        });
      },
    }),
  );

export default useTradingLabStore;