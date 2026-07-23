export type MarketPriceResponse = {
  prices: Record<string, number>;
  errors: Record<string, string>;
  updatedAt: string;
  source: "Twelve Data";
};

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizeSymbols = (
  symbols: string[],
): string[] => {
  return Array.from(
    new Set(
      symbols
        .map((symbol) =>
          symbol.trim().toUpperCase(),
        )
        .filter(Boolean),
    ),
  );
};

const normalizePriceMap = (
  value: unknown,
): Record<string, number> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<
    Record<string, number>
  >((accumulator, [symbol, rawPrice]) => {
    const price = Number(rawPrice);

    if (
      Number.isFinite(price) &&
      price > 0
    ) {
      accumulator[symbol.toUpperCase()] =
        price;
    }

    return accumulator;
  }, {});
};

const normalizeErrorMap = (
  value: unknown,
): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<
    Record<string, string>
  >((accumulator, [symbol, rawMessage]) => {
    if (
      typeof rawMessage === "string" &&
      rawMessage.trim()
    ) {
      accumulator[symbol.toUpperCase()] =
        rawMessage.trim();
    }

    return accumulator;
  }, {});
};

const getResponseMessage = (
  value: unknown,
): string | null => {
  if (
    isRecord(value) &&
    typeof value.message === "string" &&
    value.message.trim()
  ) {
    return value.message.trim();
  }

  return null;
};

export const fetchLatestMarketPrices = async (
  symbols: string[],
  signal?: AbortSignal,
): Promise<MarketPriceResponse> => {
  const normalizedSymbols =
    normalizeSymbols(symbols);

  if (normalizedSymbols.length === 0) {
    throw new Error(
      "There are no symbols to update.",
    );
  }

  const searchParameters = new URLSearchParams({
    symbols: normalizedSymbols.join(","),
  });

  const response = await fetch(
    `/api/market-prices?${searchParameters.toString()}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    },
  );

  let responseData: unknown;

  try {
    responseData = await response.json();
  } catch {
    throw new Error(
      "The price service returned an invalid response.",
    );
  }

  if (!response.ok) {
    throw new Error(
      getResponseMessage(responseData) ??
        `The price service failed with status ${response.status}.`,
    );
  }

  if (!isRecord(responseData)) {
    throw new Error(
      "The price service returned an invalid response.",
    );
  }

  const prices = normalizePriceMap(
    responseData.prices,
  );

  const errors = normalizeErrorMap(
    responseData.errors,
  );

  const updatedAt =
    typeof responseData.updatedAt === "string" &&
    !Number.isNaN(
      new Date(responseData.updatedAt).getTime(),
    )
      ? responseData.updatedAt
      : new Date().toISOString();

  if (Object.keys(prices).length === 0) {
    const firstError =
      Object.values(errors)[0];

    throw new Error(
      firstError ??
        "No valid market prices were returned.",
    );
  }

  return {
    prices,
    errors,
    updatedAt,
    source: "Twelve Data",
  };
};
