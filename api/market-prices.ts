type PriceMap = Record<string, number>;

type ErrorMap = Record<string, string>;

type MarketDataResponse = {
  prices: PriceMap;
  errors: ErrorMap;
  updatedAt: string;
  source: "Twelve Data";
};

const MAX_SYMBOLS_PER_REQUEST = 8;
const REQUEST_TIMEOUT_MS = 12_000;

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizeSymbols = (
  value: string | null,
): string[] => {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean),
    ),
  );
};

const parsePositivePrice = (
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

const getErrorMessage = (
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

const createJsonResponse = (
  body: unknown,
  status: number,
): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type":
        "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};

const parseProviderResponse = (
  value: unknown,
  symbols: string[],
): {
  prices: PriceMap;
  errors: ErrorMap;
} => {
  const prices: PriceMap = {};
  const errors: ErrorMap = {};

  if (!isRecord(value)) {
    throw new Error(
      "The market data provider returned an invalid response.",
    );
  }

  const globalError = getErrorMessage(value);

  if (value.status === "error") {
    throw new Error(
      globalError ??
        "The market data provider rejected the request.",
    );
  }

  if (symbols.length === 1) {
    const symbol = symbols[0];

    const price = parsePositivePrice(value.price);

    if (price !== null) {
      prices[symbol] = price;
    } else {
      errors[symbol] =
        globalError ??
        `No valid price was returned for ${symbol}.`;
    }

    return {
      prices,
      errors,
    };
  }

  symbols.forEach((symbol) => {
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
      getErrorMessage(symbolResponse) ??
      `No valid price was returned for ${symbol}.`;
  });

  return {
    prices,
    errors,
  };
};

export async function GET(
  request: Request,
): Promise<Response> {
  const apiKey =
    process.env.TWELVE_DATA_API_KEY?.trim() ?? "";

  if (!apiKey) {
    return createJsonResponse(
      {
        message:
          "TWELVE_DATA_API_KEY is not configured in Vercel.",
      },
      503,
    );
  }

  const requestUrl = new URL(request.url);

  const symbols = normalizeSymbols(
    requestUrl.searchParams.get("symbols"),
  );

  if (symbols.length === 0) {
    return createJsonResponse(
      {
        message:
          "At least one market symbol is required.",
      },
      400,
    );
  }

  if (
    symbols.length >
    MAX_SYMBOLS_PER_REQUEST
  ) {
    return createJsonResponse(
      {
        message:
          "A maximum of 8 symbols can be updated per request.",
      },
      429,
    );
  }

  const providerUrl = new URL(
    "https://api.twelvedata.com/price",
  );

  providerUrl.searchParams.set(
    "symbol",
    symbols.join(","),
  );

  providerUrl.searchParams.set("dp", "8");

  providerUrl.searchParams.set(
    "apikey",
    apiKey,
  );

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const providerResponse = await fetch(
      providerUrl,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    );

    const providerText =
      await providerResponse.text();

    let providerData: unknown;

    try {
      providerData = JSON.parse(providerText);
    } catch {
      return createJsonResponse(
        {
          message:
            "The market data provider returned invalid JSON.",
        },
        502,
      );
    }

    if (!providerResponse.ok) {
      return createJsonResponse(
        {
          message:
            getErrorMessage(providerData) ??
            `Market data request failed with status ${providerResponse.status}.`,
        },
        502,
      );
    }

    let parsedResponse: {
      prices: PriceMap;
      errors: ErrorMap;
    };

    try {
      parsedResponse = parseProviderResponse(
        providerData,
        symbols,
      );
    } catch (error) {
      return createJsonResponse(
        {
          message:
            error instanceof Error
              ? error.message
              : "Unable to process market prices.",
        },
        502,
      );
    }

    if (
      Object.keys(parsedResponse.prices).length === 0
    ) {
      return createJsonResponse(
        {
          message:
            Object.values(
              parsedResponse.errors,
            )[0] ??
            "No valid market prices were returned.",
          errors: parsedResponse.errors,
        },
        502,
      );
    }

    const responseBody: MarketDataResponse = {
      prices: parsedResponse.prices,
      errors: parsedResponse.errors,
      updatedAt: new Date().toISOString(),
      source: "Twelve Data",
    };

    return createJsonResponse(
      responseBody,
      200,
    );
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      error.name === "AbortError";

    return createJsonResponse(
      {
        message: isTimeout
          ? "The market data request timed out."
          : error instanceof Error
            ? error.message
            : "Unable to retrieve market prices.",
      },
      isTimeout ? 504 : 502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}