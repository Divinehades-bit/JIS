export type WatchlistTrendDirection =
  | "Bullish"
  | "Sideways"
  | "Bearish";

export type WatchlistTrendPoint = {
  date: string;
  close: number;
};

export type WatchlistTrendResult = {
  symbol: string;
  currentPrice: number;
  latestMarketDate: string;

  change1mPct: number | null;
  change3mPct: number | null;
  change6mPct: number | null;
  change1yPct: number | null;

  sma20: number;
  sma50: number;

  distanceToSma20Pct: number;
  distanceToSma50Pct: number;

  high52w: number;
  low52w: number;
  rangePosition52wPct: number;

  trend:
    WatchlistTrendDirection;

  points:
    WatchlistTrendPoint[];

  updatedAt: string;
};

export type WatchlistTrendResponse = {
  results:
    WatchlistTrendResult[];

  errors:
    Record<string, string>;

  updatedAt: string;
  source: "Twelve Data";
};

export class WatchlistTrendRequestError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name =
      "WatchlistTrendRequestError";

    this.status = status;
  }
}

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

const isValidTrend = (
  value: unknown,
): value is WatchlistTrendDirection => {
  return (
    value === "Bullish" ||
    value === "Sideways" ||
    value === "Bearish"
  );
};

const isTrendPoint = (
  value: unknown,
): value is WatchlistTrendPoint => {
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

const isTrendResult = (
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
    isValidTrend(
      value.trend,
    ) &&
    Array.isArray(
      value.points,
    ) &&
    value.points.every(
      isTrendPoint,
    ) &&
    typeof value.updatedAt ===
      "string"
  );
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
        .filter(
          (symbol) =>
            Boolean(symbol),
        ),
    ),
  );
};

const normalizeErrors = (
  value: unknown,
): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(
    value,
  ).reduce<
    Record<string, string>
  >(
    (
      errors,
      [symbol, message],
    ) => {
      if (
        typeof message ===
          "string" &&
        message.trim()
      ) {
        errors[
          symbol.toUpperCase()
        ] = message.trim();
      }

      return errors;
    },
    {},
  );
};

const getResponseMessage = (
  value: unknown,
): string | null => {
  if (
    isRecord(value) &&
    typeof value.message ===
      "string" &&
    value.message.trim()
  ) {
    return value.message.trim();
  }

  return null;
};

export const fetchWatchlistTrendBatch =
  async (
    symbols: string[],
    signal?: AbortSignal,
  ): Promise<WatchlistTrendResponse> => {
    const normalizedSymbols =
      normalizeSymbols(
        symbols,
      );

    if (
      normalizedSymbols.length ===
      0
    ) {
      throw new WatchlistTrendRequestError(
        "There are no Watchlist symbols to update.",
        400,
      );
    }

    if (
      normalizedSymbols.length >
      8
    ) {
      throw new WatchlistTrendRequestError(
        "A maximum of 8 Watchlist symbols can be updated per request.",
        400,
      );
    }

    const searchParameters =
      new URLSearchParams({
        symbols:
          normalizedSymbols.join(
            ",",
          ),
      });

    const response =
      await fetch(
        `/api/watchlist-trends?${searchParameters.toString()}`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },

          signal,
        },
      );

    let responseData: unknown;

    try {
      responseData =
        await response.json();
    } catch {
      throw new WatchlistTrendRequestError(
        "Watchlist Trends returned an invalid response.",
        response.status,
      );
    }

    if (!response.ok) {
      throw new WatchlistTrendRequestError(
        getResponseMessage(
          responseData,
        ) ??
          `Watchlist Trends failed with status ${response.status}.`,
        response.status,
      );
    }

    if (
      !isRecord(
        responseData,
      ) ||
      !Array.isArray(
        responseData.results,
      )
    ) {
      throw new WatchlistTrendRequestError(
        "Watchlist Trends returned an invalid response.",
        502,
      );
    }

    const results =
      responseData.results.filter(
        isTrendResult,
      );

    if (
      results.length === 0
    ) {
      throw new WatchlistTrendRequestError(
        "No valid Watchlist Trends were returned.",
        502,
      );
    }

    const updatedAt =
      typeof responseData.updatedAt ===
        "string" &&
      !Number.isNaN(
        new Date(
          responseData.updatedAt,
        ).getTime(),
      )
        ? responseData.updatedAt
        : new Date().toISOString();

    return {
      results,

      errors:
        normalizeErrors(
          responseData.errors,
        ),

      updatedAt,

      source:
        "Twelve Data",
    };
  };