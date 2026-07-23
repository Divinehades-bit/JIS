import { create } from "zustand";
import { fetchLatestMarketPrices } from "../services/marketDataService";
import {
  ensureInitialPortfolioSnapshot,
  recordPortfolioSnapshot,
} from "./portfolioHistoryStore";

export type Position = {
  id: number;
  symbol: string;
  shares: number;
  averageCost: number;
  price: number;
  priceUpdatedAt?: string;
};

export type TransactionType =
  | "opening"
  | "buy"
  | "sell";

export type Transaction = {
  id: string;
  type: TransactionType;
  symbol: string;
  amount: number;
  shares: number;
  price: number;
  date: string;
  note?: string;
  realizedGainLoss?: number;
};

export type AddTransactionInput = {
  type: "buy" | "sell";
  symbol: string;
  amount: number;
  price: number;
  date: string;
  note?: string;
};

export type TransactionResult = {
  success: boolean;
  error?: string;
};

export type PriceSyncStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

export type MarketPriceRefreshResult = {
  success: boolean;
  updatedSymbols: string[];
  deferredSymbols: string[];
  errors: Record<string, string>;
  error?: string;
};

type PortfolioStore = {
  positions: Position[];
  transactions: Transaction[];

  priceSyncStatus: PriceSyncStatus;
  priceSyncError: string | null;
  lastPriceSyncAt: string | null;
  deferredPriceSymbols: string[];

  addPosition: (position: Position) => void;
  updatePosition: (position: Position) => void;
  removePosition: (id: number) => void;

  addTransaction: (
    transaction: AddTransactionInput,
  ) => TransactionResult;

  refreshMarketPrices:
    () => Promise<MarketPriceRefreshResult>;
};

const PORTFOLIO_STORAGE_KEY = "portfolio";

const TRANSACTIONS_STORAGE_KEY =
  "portfolio-transactions";

const MAX_SYMBOLS_PER_REFRESH = 8;

const FLOATING_POINT_TOLERANCE =
  0.00000001;

const defaultPositions: Position[] = [
  {
    id: 1,
    symbol: "VOO",
    shares: 12,
    averageCost: 560,
    price: 560,
  },
  {
    id: 2,
    symbol: "IXN",
    shares: 8,
    averageCost: 95,
    price: 95,
  },
  {
    id: 3,
    symbol: "VEU",
    shares: 20,
    averageCost: 63,
    price: 63,
  },
];

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null
  );
};

const normalizePositiveNumber = (
  value: unknown,
): number | null => {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <= 0
  ) {
    return null;
  }

  return parsedValue;
};

const normalizeFiniteNumber = (
  value: unknown,
): number | null => {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
};

const normalizeIsoDate = (
  value: unknown,
): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return undefined;
  }

  return parsedDate.toISOString();
};

const createTransactionId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const normalizePosition = (
  value: unknown,
): Position | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = normalizePositiveNumber(
    value.id,
  );

  const shares = normalizePositiveNumber(
    value.shares,
  );

  const price = normalizePositiveNumber(
    value.price,
  );

  const averageCost =
    normalizePositiveNumber(
      value.averageCost ?? value.price,
    );

  const symbol =
    typeof value.symbol === "string"
      ? value.symbol.trim().toUpperCase()
      : "";

  if (
    id === null ||
    shares === null ||
    price === null ||
    averageCost === null ||
    !symbol
  ) {
    return null;
  }

  return {
    id,
    symbol,
    shares,
    averageCost,
    price,
    priceUpdatedAt: normalizeIsoDate(
      value.priceUpdatedAt,
    ),
  };
};

const normalizeTransaction = (
  value: unknown,
): Transaction | null => {
  if (!isRecord(value)) {
    return null;
  }

  const validTypes: TransactionType[] = [
    "opening",
    "buy",
    "sell",
  ];

  const type =
    typeof value.type === "string" &&
    validTypes.includes(
      value.type as TransactionType,
    )
      ? (value.type as TransactionType)
      : null;

  const id =
    typeof value.id === "string" ||
    typeof value.id === "number"
      ? String(value.id)
      : "";

  const symbol =
    typeof value.symbol === "string"
      ? value.symbol.trim().toUpperCase()
      : "";

  const shares = normalizePositiveNumber(
    value.shares,
  );

  const price = normalizePositiveNumber(
    value.price,
  );

  const derivedAmount =
    shares !== null && price !== null
      ? shares * price
      : null;

  const amount = normalizePositiveNumber(
    value.amount ?? derivedAmount,
  );

  const date =
    typeof value.date === "string"
      ? value.date
      : "";

  const parsedDate = new Date(date);

  if (
    !type ||
    !id ||
    !symbol ||
    shares === null ||
    price === null ||
    amount === null ||
    !date ||
    Number.isNaN(parsedDate.getTime())
  ) {
    return null;
  }

  const note =
    typeof value.note === "string" &&
    value.note.trim()
      ? value.note.trim()
      : undefined;

  const realizedGainLoss =
    value.realizedGainLoss === undefined
      ? undefined
      : normalizeFiniteNumber(
          value.realizedGainLoss,
        ) ?? undefined;

  return {
    id,
    type,
    symbol,
    amount,
    shares,
    price,
    date: parsedDate.toISOString(),
    note,
    realizedGainLoss,
  };
};

const savePositions = (
  positions: Position[],
) => {
  try {
    localStorage.setItem(
      PORTFOLIO_STORAGE_KEY,
      JSON.stringify(positions),
    );
  } catch (error) {
    console.error(
      "Unable to save portfolio:",
      error,
    );
  }
};

const saveTransactions = (
  transactions: Transaction[],
) => {
  try {
    localStorage.setItem(
      TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(transactions),
    );
  } catch (error) {
    console.error(
      "Unable to save transactions:",
      error,
    );
  }
};

const loadPositions = (): Position[] => {
  try {
    const savedPositions =
      localStorage.getItem(
        PORTFOLIO_STORAGE_KEY,
      );

    if (savedPositions === null) {
      savePositions(defaultPositions);
      return defaultPositions;
    }

    const parsedPositions: unknown =
      JSON.parse(savedPositions);

    if (!Array.isArray(parsedPositions)) {
      savePositions(defaultPositions);
      return defaultPositions;
    }

    const normalizedPositions =
      parsedPositions
        .map(normalizePosition)
        .filter(
          (
            position,
          ): position is Position =>
            position !== null,
        );

    if (
      parsedPositions.length > 0 &&
      normalizedPositions.length === 0
    ) {
      savePositions(defaultPositions);
      return defaultPositions;
    }

    savePositions(normalizedPositions);

    return normalizedPositions;
  } catch (error) {
    console.error(
      "Unable to load portfolio:",
      error,
    );

    savePositions(defaultPositions);

    return defaultPositions;
  }
};

const createOpeningTransactions = (
  positions: Position[],
): Transaction[] => {
  const migrationDate =
    new Date().toISOString();

  return positions.map((position) => ({
    id: createTransactionId(),
    type: "opening",
    symbol: position.symbol,
    amount:
      position.shares *
      position.averageCost,
    shares: position.shares,
    price: position.averageCost,
    date: migrationDate,
    note: "Imported opening position",
  }));
};

const loadTransactions = (
  positions: Position[],
): Transaction[] => {
  try {
    const savedTransactions =
      localStorage.getItem(
        TRANSACTIONS_STORAGE_KEY,
      );

    if (savedTransactions === null) {
      const openingTransactions =
        createOpeningTransactions(positions);

      saveTransactions(
        openingTransactions,
      );

      return openingTransactions;
    }

    const parsedTransactions: unknown =
      JSON.parse(savedTransactions);

    if (!Array.isArray(parsedTransactions)) {
      saveTransactions([]);
      return [];
    }

    const normalizedTransactions =
      parsedTransactions
        .map(normalizeTransaction)
        .filter(
          (
            transaction,
          ): transaction is Transaction =>
            transaction !== null,
        )
        .sort(
          (
            firstTransaction,
            secondTransaction,
          ) =>
            new Date(
              secondTransaction.date,
            ).getTime() -
            new Date(
              firstTransaction.date,
            ).getTime(),
        );

    saveTransactions(
      normalizedTransactions,
    );

    return normalizedTransactions;
  } catch (error) {
    console.error(
      "Unable to load transactions:",
      error,
    );

    return [];
  }
};

const getSymbolPositions = (
  positions: Position[],
  symbol: string,
) => {
  return positions.filter(
    (position) =>
      position.symbol
        .trim()
        .toUpperCase() === symbol,
  );
};

const replaceSymbolPositions = (
  positions: Position[],
  symbol: string,
  replacement: Position | null,
): Position[] => {
  const firstMatchingIndex =
    positions.findIndex(
      (position) =>
        position.symbol
          .trim()
          .toUpperCase() === symbol,
    );

  if (firstMatchingIndex === -1) {
    return replacement
      ? [...positions, replacement]
      : positions;
  }

  const nextPositions: Position[] = [];

  positions.forEach(
    (position, index) => {
      const matchesSymbol =
        position.symbol
          .trim()
          .toUpperCase() === symbol;

      if (!matchesSymbol) {
        nextPositions.push(position);
        return;
      }

      if (
        index === firstMatchingIndex &&
        replacement !== null
      ) {
        nextPositions.push(replacement);
      }
    },
  );

  return nextPositions;
};

const getLatestPriceUpdate = (
  positions: Position[],
): string | null => {
  const timestamps = positions
    .map((position) => {
      if (!position.priceUpdatedAt) {
        return null;
      }

      const timestamp = new Date(
        position.priceUpdatedAt,
      ).getTime();

      return Number.isFinite(timestamp)
        ? timestamp
        : null;
    })
    .filter(
      (
        timestamp,
      ): timestamp is number =>
        timestamp !== null,
    );

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(
    Math.max(...timestamps),
  ).toISOString();
};

type SymbolPriceAge = {
  symbol: string;
  updatedAt: number | null;
};

const getSymbolsForNextRefresh = (
  positions: Position[],
) => {
  const symbolMap = new Map<
    string,
    number | null
  >();

  positions.forEach((position) => {
    const symbol = position.symbol
      .trim()
      .toUpperCase();

    if (!symbol) {
      return;
    }

    const timestamp =
      position.priceUpdatedAt
        ? new Date(
            position.priceUpdatedAt,
          ).getTime()
        : Number.NaN;

    const validTimestamp =
      Number.isFinite(timestamp)
        ? timestamp
        : null;

    if (!symbolMap.has(symbol)) {
      symbolMap.set(
        symbol,
        validTimestamp,
      );

      return;
    }

    /*
     * Map.get() can theoretically return
     * undefined even after Map.has().
     * Normalize it to null so TypeScript
     * knows Math.min() only receives numbers.
     */
    const existingTimestamp =
      symbolMap.get(symbol) ?? null;

    if (
      existingTimestamp === null ||
      validTimestamp === null
    ) {
      symbolMap.set(symbol, null);
      return;
    }

    symbolMap.set(
      symbol,
      Math.min(
        existingTimestamp,
        validTimestamp,
      ),
    );
  });

  const orderedSymbols: SymbolPriceAge[] =
    Array.from(
      symbolMap.entries(),
    ).map(([symbol, updatedAt]) => ({
      symbol,
      updatedAt,
    }));

  orderedSymbols.sort(
    (firstSymbol, secondSymbol) => {
      if (
        firstSymbol.updatedAt === null &&
        secondSymbol.updatedAt !== null
      ) {
        return -1;
      }

      if (
        firstSymbol.updatedAt !== null &&
        secondSymbol.updatedAt === null
      ) {
        return 1;
      }

      if (
        firstSymbol.updatedAt === null &&
        secondSymbol.updatedAt === null
      ) {
        return firstSymbol.symbol.localeCompare(
          secondSymbol.symbol,
        );
      }

      return (
        (firstSymbol.updatedAt ?? 0) -
        (secondSymbol.updatedAt ?? 0)
      );
    },
  );

  const symbols = orderedSymbols.map(
    (item) => item.symbol,
  );

  return {
    selectedSymbols: symbols.slice(
      0,
      MAX_SYMBOLS_PER_REFRESH,
    ),

    deferredSymbols: symbols.slice(
      MAX_SYMBOLS_PER_REFRESH,
    ),
  };
};

const initialPositions =
  loadPositions();

const initialTransactions =
  loadTransactions(initialPositions);

ensureInitialPortfolioSnapshot(
  initialPositions,
);

const usePortfolioStore =
  create<PortfolioStore>((set, get) => ({
    positions: initialPositions,
    transactions: initialTransactions,

    priceSyncStatus: "idle",
    priceSyncError: null,

    lastPriceSyncAt:
      getLatestPriceUpdate(
        initialPositions,
      ),

    deferredPriceSymbols: [],

    addPosition: (position) => {
      const normalizedPosition =
        normalizePosition(position);

      if (!normalizedPosition) {
        console.error(
          "Invalid position:",
          position,
        );

        return;
      }

      set((state) => {
        const nextPosition: Position = {
          ...normalizedPosition,
          priceUpdatedAt:
            normalizedPosition.priceUpdatedAt,
        };

        const nextPositions = [
          ...state.positions,
          nextPosition,
        ];

        const openingTransaction: Transaction =
          {
            id: createTransactionId(),
            type: "opening",
            symbol: nextPosition.symbol,

            amount:
              nextPosition.shares *
              nextPosition.averageCost,

            shares:
              nextPosition.shares,

            price:
              nextPosition.averageCost,

            date:
              new Date().toISOString(),

            note:
              "Position added manually",
          };

        const nextTransactions = [
          openingTransaction,
          ...state.transactions,
        ];

        savePositions(nextPositions);

        saveTransactions(
          nextTransactions,
        );

        recordPortfolioSnapshot(
          nextPositions,
          "portfolio-change",
        );

        return {
          positions: nextPositions,

          transactions:
            nextTransactions,

          lastPriceSyncAt:
            getLatestPriceUpdate(
              nextPositions,
            ),
        };
      });
    },

    updatePosition: (
      updatedPosition,
    ) => {
      const normalizedPosition =
        normalizePosition(
          updatedPosition,
        );

      if (!normalizedPosition) {
        console.error(
          "Invalid updated position:",
          updatedPosition,
        );

        return;
      }

      set((state) => {
        const nextPositions =
          state.positions.map(
            (position) =>
              position.id ===
              normalizedPosition.id
                ? {
                    ...normalizedPosition,

                    priceUpdatedAt:
                      normalizedPosition.priceUpdatedAt ??
                      position.priceUpdatedAt,
                  }
                : position,
          );

        savePositions(nextPositions);

        recordPortfolioSnapshot(
          nextPositions,
          "portfolio-change",
        );

        return {
          positions: nextPositions,

          lastPriceSyncAt:
            getLatestPriceUpdate(
              nextPositions,
            ),
        };
      });
    },

    removePosition: (id) => {
      set((state) => {
        const nextPositions =
          state.positions.filter(
            (position) =>
              position.id !== id,
          );

        savePositions(nextPositions);

        recordPortfolioSnapshot(
          nextPositions,
          "portfolio-change",
        );

        return {
          positions: nextPositions,

          lastPriceSyncAt:
            getLatestPriceUpdate(
              nextPositions,
            ),
        };
      });
    },

    addTransaction: (input) => {
      let result: TransactionResult = {
        success: false,
        error:
          "Unable to record the transaction.",
      };

      set((state) => {
        const symbol = input.symbol
          .trim()
          .toUpperCase();

        const amount =
          normalizePositiveNumber(
            input.amount,
          );

        const price =
          normalizePositiveNumber(
            input.price,
          );

        const parsedDate = new Date(
          input.date,
        );

        if (!symbol) {
          result = {
            success: false,
            error:
              "Symbol is required.",
          };

          return state;
        }

        if (amount === null) {
          result = {
            success: false,
            error:
              "Amount must be greater than zero.",
          };

          return state;
        }

        if (price === null) {
          result = {
            success: false,
            error:
              "Price must be greater than zero.",
          };

          return state;
        }

        if (
          Number.isNaN(
            parsedDate.getTime(),
          )
        ) {
          result = {
            success: false,
            error:
              "Enter a valid transaction date.",
          };

          return state;
        }

        const calculatedShares =
          amount / price;

        if (
          !Number.isFinite(
            calculatedShares,
          ) ||
          calculatedShares <= 0
        ) {
          result = {
            success: false,
            error:
              "Unable to calculate the shares.",
          };

          return state;
        }

        const matchingPositions =
          getSymbolPositions(
            state.positions,
            symbol,
          );

        const currentShares =
          matchingPositions.reduce(
            (total, position) =>
              total +
              position.shares,
            0,
          );

        const currentInvestedCapital =
          matchingPositions.reduce(
            (total, position) =>
              total +
              position.shares *
                position.averageCost,
            0,
          );

        const currentAverageCost =
          currentShares > 0
            ? currentInvestedCapital /
              currentShares
            : 0;

        const firstPosition =
          matchingPositions[0] ?? null;

        let nextPositions: Position[];

        let realizedGainLoss:
          | number
          | undefined;

        if (input.type === "buy") {
          const nextShares =
            currentShares +
            calculatedShares;

          const nextInvestedCapital =
            currentInvestedCapital +
            amount;

          const nextAverageCost =
            nextInvestedCapital /
            nextShares;

          const nextPosition: Position = {
            id:
              firstPosition?.id ??
              Date.now(),

            symbol,

            shares:
              nextShares,

            averageCost:
              nextAverageCost,

            price,

            priceUpdatedAt:
              firstPosition?.priceUpdatedAt,
          };

          nextPositions =
            replaceSymbolPositions(
              state.positions,
              symbol,
              nextPosition,
            );
        } else {
          if (currentShares <= 0) {
            result = {
              success: false,

              error: `You do not own any shares of ${symbol}.`,
            };

            return state;
          }

          if (
            calculatedShares >
            currentShares +
              FLOATING_POINT_TOLERANCE
          ) {
            result = {
              success: false,
              error:
                "The sale exceeds the available shares.",
            };

            return state;
          }

          const remainingShares =
            currentShares -
            calculatedShares;

          realizedGainLoss =
            amount -
            currentAverageCost *
              calculatedShares;

          if (
            remainingShares <=
            FLOATING_POINT_TOLERANCE
          ) {
            nextPositions =
              replaceSymbolPositions(
                state.positions,
                symbol,
                null,
              );
          } else {
            const nextPosition: Position = {
              id:
                firstPosition?.id ??
                Date.now(),

              symbol,

              shares:
                remainingShares,

              averageCost:
                currentAverageCost,

              price,

              priceUpdatedAt:
                firstPosition?.priceUpdatedAt,
            };

            nextPositions =
              replaceSymbolPositions(
                state.positions,
                symbol,
                nextPosition,
              );
          }
        }

        const transaction: Transaction = {
          id: createTransactionId(),
          type: input.type,
          symbol,
          amount,

          shares:
            calculatedShares,

          price,

          date:
            parsedDate.toISOString(),

          note:
            input.note?.trim() ||
            undefined,

          realizedGainLoss,
        };

        const nextTransactions = [
          transaction,
          ...state.transactions,
        ].sort(
          (
            firstTransaction,
            secondTransaction,
          ) =>
            new Date(
              secondTransaction.date,
            ).getTime() -
            new Date(
              firstTransaction.date,
            ).getTime(),
        );

        savePositions(nextPositions);

        saveTransactions(
          nextTransactions,
        );

        recordPortfolioSnapshot(
          nextPositions,
          "transaction",
          parsedDate.toISOString(),
        );

        result = {
          success: true,
        };

        return {
          positions:
            nextPositions,

          transactions:
            nextTransactions,

          lastPriceSyncAt:
            getLatestPriceUpdate(
              nextPositions,
            ),
        };
      });

      return result;
    },

    refreshMarketPrices: async () => {
      if (
        get().priceSyncStatus ===
        "loading"
      ) {
        return {
          success: false,
          updatedSymbols: [],
          deferredSymbols: [],
          errors: {},

          error:
            "A price update is already running.",
        };
      }

      const {
        selectedSymbols,
        deferredSymbols,
      } = getSymbolsForNextRefresh(
        get().positions,
      );

      if (
        selectedSymbols.length === 0
      ) {
        const error =
          "There are no positions to update.";

        set({
          priceSyncStatus: "error",
          priceSyncError: error,
          deferredPriceSymbols: [],
        });

        return {
          success: false,
          updatedSymbols: [],
          deferredSymbols: [],
          errors: {},
          error,
        };
      }

      set({
        priceSyncStatus: "loading",
        priceSyncError: null,
      });

      try {
        const response =
          await fetchLatestMarketPrices(
            selectedSymbols,
          );

        const updatedSymbols =
          Object.keys(response.prices);

        const failedSymbols =
          Object.keys(response.errors);

        set((state) => {
          const nextPositions =
            state.positions.map(
              (position) => {
                const symbol =
                  position.symbol
                    .trim()
                    .toUpperCase();

                const latestPrice =
                  response.prices[
                    symbol
                  ];

                if (
                  latestPrice === undefined
                ) {
                  return position;
                }

                return {
                  ...position,

                  price:
                    latestPrice,

                  priceUpdatedAt:
                    response.updatedAt,
                };
              },
            );

          const partialError =
            failedSymbols.length > 0
              ? `Some symbols were not updated: ${failedSymbols.join(
                  ", ",
                )}.`
              : null;

          savePositions(
            nextPositions,
          );

          if (
            updatedSymbols.length > 0
          ) {
            recordPortfolioSnapshot(
              nextPositions,
              "market-sync",
              response.updatedAt,
            );
          }

          return {
            positions:
              nextPositions,

            priceSyncStatus:
              partialError
                ? "error"
                : "success",

            priceSyncError:
              partialError,

            lastPriceSyncAt:
              response.updatedAt,

            deferredPriceSymbols:
              deferredSymbols,
          };
        });

        return {
          success:
            updatedSymbols.length > 0,

          updatedSymbols,

          deferredSymbols,

          errors:
            response.errors,

          error:
            failedSymbols.length > 0
              ? `Some symbols were not updated: ${failedSymbols.join(
                  ", ",
                )}.`
              : undefined,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to update market prices.";

        set({
          priceSyncStatus: "error",
          priceSyncError: message,

          deferredPriceSymbols:
            deferredSymbols,
        });

        return {
          success: false,
          updatedSymbols: [],
          deferredSymbols,
          errors: {},
          error: message,
        };
      }
    },
  }));

export default usePortfolioStore;