import { create } from "zustand";

import {
  MARKET_UNIVERSE,
  MARKET_UNIVERSE_SYMBOLS,
  getMarketUniverseItem,
} from "../data/marketUniverse";

import {
  MarketOpportunityRequestError,
  fetchMarketOpportunityBatch,
  type MarketOpportunity,
} from "../services/marketOpportunityService";

export type RankedMarketOpportunity =
  MarketOpportunity & {
    name: string;
    sector: string;
  };

export type MarketScanStatus =
  | "idle"
  | "scanning"
  | "waiting"
  | "success"
  | "error";

type SavedMarketOpportunityData = {
  opportunities: RankedMarketOpportunity[];
  lastScanAt: string | null;
};

type MarketOpportunityStore = {
  opportunities: RankedMarketOpportunity[];
  lastScanAt: string | null;
  scanStatus: MarketScanStatus;
  scanError: string | null;
  scanCompletedCount: number;
  scanTotalCount: number;
  nextRetryAt: string | null;
  scanMarket: () => Promise<void>;
  clearMarketScan: () => void;
};

export const MARKET_OPPORTUNITY_STORAGE_KEY =
  "jis-market-opportunities";

const BATCH_SIZE = 8;
const RATE_LIMIT_WAIT_MS = 65_000;
const MAX_RATE_LIMIT_RETRIES = 3;

const createDefaultSavedData =
  (): SavedMarketOpportunityData => {
    return {
      opportunities: [],
      lastScanAt: null,
    };
  };

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isSavedOpportunity = (
  value: unknown,
): value is RankedMarketOpportunity => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.symbol === "string" &&
    typeof value.name === "string" &&
    typeof value.sector === "string" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    typeof value.scannedAt === "string"
  );
};

const loadSavedData =
  (): SavedMarketOpportunityData => {
    if (typeof window === "undefined") {
      return createDefaultSavedData();
    }

    try {
      const savedValue =
        localStorage.getItem(
          MARKET_OPPORTUNITY_STORAGE_KEY,
        );

      if (!savedValue) {
        return createDefaultSavedData();
      }

      const parsedValue: unknown =
        JSON.parse(savedValue);

      if (!isRecord(parsedValue)) {
        return createDefaultSavedData();
      }

      const opportunities =
        Array.isArray(
          parsedValue.opportunities,
        )
          ? parsedValue.opportunities.filter(
              isSavedOpportunity,
            )
          : [];

      const lastScanAt =
        typeof parsedValue.lastScanAt ===
          "string" &&
        !Number.isNaN(
          new Date(
            parsedValue.lastScanAt,
          ).getTime(),
        )
          ? parsedValue.lastScanAt
          : null;

      return {
        opportunities,
        lastScanAt,
      };
    } catch (error) {
      console.error(
        "Unable to load market opportunities:",
        error,
      );

      return createDefaultSavedData();
    }
  };

const saveData = (
  data: SavedMarketOpportunityData,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      MARKET_OPPORTUNITY_STORAGE_KEY,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error(
      "Unable to save market opportunities:",
      error,
    );
  }
};

const removeSavedData = (): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(
      MARKET_OPPORTUNITY_STORAGE_KEY,
    );
  } catch (error) {
    console.error(
      "Unable to clear market opportunities:",
      error,
    );
  }
};

const wait = (
  milliseconds: number,
): Promise<void> => {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
};

const createBatches = (
  symbols: string[],
): string[][] => {
  const batches: string[][] = [];

  for (
    let index = 0;
    index < symbols.length;
    index += BATCH_SIZE
  ) {
    batches.push(
      symbols.slice(
        index,
        index + BATCH_SIZE,
      ),
    );
  }

  return batches;
};

const enrichOpportunity = (
  opportunity: MarketOpportunity,
): RankedMarketOpportunity => {
  const universeItem =
    getMarketUniverseItem(
      opportunity.symbol,
    );

  return {
    ...opportunity,
    name:
      universeItem?.name ??
      opportunity.symbol,
    sector:
      universeItem?.sector ??
      "Other",
  };
};

const sortOpportunities = (
  opportunities: RankedMarketOpportunity[],
): RankedMarketOpportunity[] => {
  return [...opportunities].sort(
    (first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return (
        second.change20dPct -
        first.change20dPct
      );
    },
  );
};

const mergeOpportunities = (
  current: RankedMarketOpportunity[],
  incoming: RankedMarketOpportunity[],
): RankedMarketOpportunity[] => {
  const opportunityMap =
    new Map<
      string,
      RankedMarketOpportunity
    >();

  current.forEach((opportunity) => {
    opportunityMap.set(
      opportunity.symbol,
      opportunity,
    );
  });

  incoming.forEach((opportunity) => {
    opportunityMap.set(
      opportunity.symbol,
      opportunity,
    );
  });

  return sortOpportunities(
    Array.from(opportunityMap.values()),
  );
};

const savedData = loadSavedData();

const useMarketOpportunityStore =
  create<MarketOpportunityStore>(
    (set, get) => ({
      opportunities:
        savedData.opportunities,

      lastScanAt:
        savedData.lastScanAt,

      scanStatus: "idle",

      scanError: null,

      scanCompletedCount: 0,

      scanTotalCount:
        MARKET_UNIVERSE.length,

      nextRetryAt: null,

      scanMarket: async () => {
        const currentStatus =
          get().scanStatus;

        if (
          currentStatus ===
            "scanning" ||
          currentStatus ===
            "waiting"
        ) {
          return;
        }

        set({
          scanStatus: "scanning",
          scanError: null,
          scanCompletedCount: 0,
          scanTotalCount:
            MARKET_UNIVERSE.length,
          nextRetryAt: null,
        });

        const batches =
          createBatches(
            MARKET_UNIVERSE_SYMBOLS,
          );

        let accumulatedOpportunities:
          RankedMarketOpportunity[] = [];

        const accumulatedErrors:
          Record<string, string> = {};

        let latestUpdateAt:
          string | null = null;

        try {
          for (
            let batchIndex = 0;
            batchIndex < batches.length;
            batchIndex += 1
          ) {
            const batch =
              batches[batchIndex];

            let retryCount = 0;
            let batchCompleted = false;

            while (!batchCompleted) {
              try {
                set({
                  scanStatus:
                    "scanning",
                  nextRetryAt: null,
                });

                const response =
                  await fetchMarketOpportunityBatch(
                    batch,
                  );

                const enriched =
                  response.opportunities.map(
                    enrichOpportunity,
                  );

                accumulatedOpportunities =
                  mergeOpportunities(
                    accumulatedOpportunities,
                    enriched,
                  );

                Object.assign(
                  accumulatedErrors,
                  response.errors,
                );

                latestUpdateAt =
                  response.updatedAt;

                const completedCount =
                  Math.min(
                    (batchIndex + 1) *
                      BATCH_SIZE,
                    MARKET_UNIVERSE.length,
                  );

                set({
                  opportunities:
                    accumulatedOpportunities,
                  scanCompletedCount:
                    completedCount,
                });

                saveData({
                  opportunities:
                    accumulatedOpportunities,
                  lastScanAt:
                    get().lastScanAt,
                });

                batchCompleted = true;
              } catch (error) {
                const rateLimited =
                  error instanceof
                    MarketOpportunityRequestError &&
                  error.status === 429;

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
                    scanStatus:
                      "waiting",
                    scanError:
                      "API credit limit reached. JIS will continue automatically.",
                    nextRetryAt,
                  });

                  await wait(
                    RATE_LIMIT_WAIT_MS,
                  );

                  continue;
                }

                const message =
                  error instanceof Error
                    ? error.message
                    : "Unable to analyze this market batch.";

                batch.forEach(
                  (symbol) => {
                    accumulatedErrors[
                      symbol
                    ] = message;
                  },
                );

                const completedCount =
                  Math.min(
                    (batchIndex + 1) *
                      BATCH_SIZE,
                    MARKET_UNIVERSE.length,
                  );

                set({
                  scanCompletedCount:
                    completedCount,
                });

                batchCompleted = true;
              }
            }
          }

          if (
            accumulatedOpportunities.length ===
            0
          ) {
            throw new Error(
              Object.values(
                accumulatedErrors,
              )[0] ??
                "The market scan returned no valid results.",
            );
          }

          const finalScanAt =
            latestUpdateAt ??
            new Date().toISOString();

          const errorCount =
            Object.keys(
              accumulatedErrors,
            ).length;

          const finalError =
            errorCount > 0
              ? `${errorCount} symbols could not be analyzed.`
              : null;

          saveData({
            opportunities:
              accumulatedOpportunities,
            lastScanAt:
              finalScanAt,
          });

          set({
            opportunities:
              accumulatedOpportunities,
            lastScanAt:
              finalScanAt,
            scanStatus:
              "success",
            scanError:
              finalError,
            scanCompletedCount:
              MARKET_UNIVERSE.length,
            nextRetryAt: null,
          });
        } catch (error) {
          set({
            scanStatus: "error",
            scanError:
              error instanceof Error
                ? error.message
                : "Unable to complete the market scan.",
            nextRetryAt: null,
          });
        }
      },

      clearMarketScan: () => {
        removeSavedData();

        set({
          opportunities: [],
          lastScanAt: null,
          scanStatus: "idle",
          scanError: null,
          scanCompletedCount: 0,
          scanTotalCount:
            MARKET_UNIVERSE.length,
          nextRetryAt: null,
        });
      },
    }),
  );

export default useMarketOpportunityStore;