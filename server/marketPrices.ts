export type MarketDataResponse = {
  prices: Record<string, number>;
  errors: Record<string, string>;
  updatedAt: string;
  source: "Twelve Data";
};

export class MarketDataError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);

    this.name = "MarketDataError";
    this.statusCode = statusCode;
  }
}

type CachedPrice = {
  price: number;
  expiresAt: number;
};

type PriceMap = Record<string, number>;
type ErrorMap = Record<string, string>;

const MAX_SYMBOLS_PER_REQUEST = 8;
const CACHE_DURATION_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;

const priceCache = new Map<string, CachedPrice>();

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const normalizeMarketSymbols = (
  symbols: string[],
): string[] => {
  return Array.from(
    new Set(
      symbols
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
};

const parsePositivePrice = (
  value: unknown,
): number | null => {
  const parsedValue =
    typeof value === "number" ? value : Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue <= 0
  ) {
    return null;
  }

  return parsedValue;
};

const getApiErrorMessage = (
  value: unknown,
): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return value.message.trim();
  }

  return null;
};

const parseTwelveDataResponse = (
  value: unknown,
  requestedSymbols: string[],
): {
  prices: PriceMap;
  errors: ErrorMap;
} => {
  const prices: PriceMap = {};
  const errors: ErrorMap = {};

  if (!isRecord(value)) {
    throw new MarketDataError(
      "The market data provider returned an invalid response.",
      502,
    );
  }

  const globalErrorMessage =
    getApiErrorMessage(value);

  if (
    value.status === "error" &&
    globalErrorMessage
  ) {
    throw new MarketDataError(
      globalErrorMessage,
      502,
    );
  }

  if (requestedSymbols.length === 1) {
    const symbol = requestedSymbols[0];
    const price = parsePositivePrice(value.price);

    if (price !== null) {
      prices[symbol] = price;

      return {
        prices,
        errors,
      };
    }

    errors[symbol] =
      globalErrorMessage ??
      `No valid price was returned for ${symbol}.`;

    return {
      prices,
      errors,
    };
  }

  requestedSymbols.forEach((symbol) => {
    const symbolResponse =
      value[symbol] ??
      value[symbol.toUpperCase()] ??
      value[symbol.toLowerCase()];

    if (!isRecord(symbolResponse)) {
      errors[symbol] =
        `No response was returned for ${symbol}.`;

      return;
    }

    const price = parsePositivePrice(
      symbolResponse.price,
    );

    if (price !== null) {
      prices[symbol] = price;
      return;
    }

    errors[symbol] =
      getApiErrorMessage(symbolResponse) ??
      `No valid price was returned for ${symbol}.`;
  });

  return {
    prices,
    errors,
  };
};

export const getLatestMarketPrices = async (
  inputSymbols: string[],
  apiKey: string,
): Promise<MarketDataResponse> => {
  if (!apiKey.trim()) {
    throw new MarketDataError(
      "TWELVE_DATA_API_KEY is not configured.",
      503,
    );
  }

  const symbols =
    normalizeMarketSymbols(inputSymbols);

  if (symbols.length === 0) {
    throw new MarketDataError(
      "At least one market symbol is required.",
      400,
    );
  }

  const now = Date.now();
  const cachedPrices: PriceMap = {};

  const missingSymbols = symbols.filter(
    (symbol) => {
      const cachedPrice = priceCache.get(symbol);

      if (
        cachedPrice &&
        cachedPrice.expiresAt > now
      ) {
        cachedPrices[symbol] = cachedPrice.price;
        return false;
      }

      priceCache.delete(symbol);

      return true;
    },
  );

  if (
    missingSymbols.length >
    MAX_SYMBOLS_PER_REQUEST
  ) {
    throw new MarketDataError(
      "The safe limit is 8 uncached symbols per refresh.",
      429,
    );
  }

  if (missingSymbols.length === 0) {
    return {
      prices: cachedPrices,
      errors: {},
      updatedAt: new Date().toISOString(),
      source: "Twelve Data",
    };
  }

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const providerUrl = new URL(
      "https://api.twelvedata.com/price",
    );

    providerUrl.searchParams.set(
      "symbol",
      missingSymbols.join(","),
    );

    providerUrl.searchParams.set("dp", "8");

    const providerResponse = await fetch(
      providerUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `apikey ${apiKey}`,
        },
        signal: controller.signal,
      },
    );

    let providerData: unknown;

    try {
      providerData =
        await providerResponse.json();
    } catch {
      throw new MarketDataError(
        "The market data provider returned invalid JSON.",
        502,
      );
    }

    if (!providerResponse.ok) {
      const providerMessage =
        getApiErrorMessage(providerData);

      throw new MarketDataError(
        providerMessage ??
          `Market data request failed with status ${providerResponse.status}.`,
        502,
      );
    }

    const parsedResponse =
      parseTwelveDataResponse(
        providerData,
        missingSymbols,
      );

    Object.entries(
      parsedResponse.prices,
    ).forEach(([symbol, price]) => {
      priceCache.set(symbol, {
        price,
        expiresAt:
          Date.now() + CACHE_DURATION_MS,
      });
    });

    return {
      prices: {
        ...cachedPrices,
        ...parsedResponse.prices,
      },
      errors: parsedResponse.errors,
      updatedAt: new Date().toISOString(),
      source: "Twelve Data",
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      error.name === "AbortError";

    const message = isTimeout
      ? "The market data request timed out."
      : error instanceof Error
        ? error.message
        : "Unable to retrieve market prices.";

    if (Object.keys(cachedPrices).length > 0) {
      const fallbackErrors =
        missingSymbols.reduce<ErrorMap>(
          (accumulator, symbol) => {
            accumulator[symbol] = message;

            return accumulator;
          },
          {},
        );

      return {
        prices: cachedPrices,
        errors: fallbackErrors,
        updatedAt: new Date().toISOString(),
        source: "Twelve Data",
      };
    }

    if (error instanceof MarketDataError) {
      throw error;
    }

    throw new MarketDataError(
      message,
      isTimeout ? 504 : 502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
};