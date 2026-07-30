type RawTimeSeriesBar = {
  datetime?: unknown;
  close?: unknown;
};

type PriceBar = {
  date: string;
  close: number;
};

type TrendDirection =
  | "Bullish"
  | "Sideways"
  | "Bearish";

type WatchlistTrendPoint = {
  date: string;
  close: number;
};

type WatchlistTrendResult = {
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

  trend: TrendDirection;
  points: WatchlistTrendPoint[];
  updatedAt: string;
};

type WatchlistTrendResponse = {
  results: WatchlistTrendResult[];
  errors: Record<string, string>;
  updatedAt: string;
  source: "Twelve Data";
};

const MAX_SYMBOLS_PER_REQUEST = 8;
const REQUIRED_BARS = 55;
const OUTPUT_SIZE = 260;
const REQUEST_TIMEOUT_MS = 25_000;

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null
  );
};

const createJsonResponse = (
  body: unknown,
  status: number,
): Response => {
  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",
      },
    },
  );
};

const round = (
  value: number,
  decimals = 2,
): number => {
  const multiplier =
    10 ** decimals;

  return (
    Math.round(
      (value +
        Number.EPSILON) *
        multiplier,
    ) / multiplier
  );
};

const average = (
  values: number[],
): number => {
  if (
    values.length === 0
  ) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) =>
        total + value,
      0,
    ) / values.length
  );
};

const parsePositiveNumber = (
  value: unknown,
): number | null => {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(
      parsedValue,
    ) ||
    parsedValue <= 0
  ) {
    return null;
  }

  return parsedValue;
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
        .map((symbol) =>
          symbol
            .trim()
            .toUpperCase(),
        )
        .filter(
          (symbol) =>
            Boolean(symbol) &&
            /^[A-Z0-9.-]{1,15}$/.test(
              symbol,
            ),
        ),
    ),
  );
};

const isValidDate = (
  value: string,
): boolean => {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    ) &&
    !Number.isNaN(
      new Date(
        `${value}T00:00:00Z`,
      ).getTime(),
    )
  );
};

const parseBars = (
  value: unknown,
): PriceBar[] => {
  if (
    !isRecord(value) ||
    !Array.isArray(
      value.values,
    )
  ) {
    return [];
  }

  return value.values
    .map(
      (
        rawValue,
      ): PriceBar | null => {
        if (
          !isRecord(
            rawValue,
          )
        ) {
          return null;
        }

        const rawBar =
          rawValue as RawTimeSeriesBar;

        const date =
          typeof rawBar.datetime ===
            "string"
            ? rawBar.datetime
                .trim()
                .slice(0, 10)
            : "";

        const close =
          parsePositiveNumber(
            rawBar.close,
          );

        if (
          !isValidDate(date) ||
          close === null
        ) {
          return null;
        }

        return {
          date,
          close,
        };
      },
    )
    .filter(
      (
        bar,
      ): bar is PriceBar =>
        bar !== null,
    )
    .sort(
      (first, second) =>
        first.date.localeCompare(
          second.date,
        ),
    );
};

const getErrorMessage = (
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

const isRateLimitError = (
  value: unknown,
): boolean => {
  if (
    !isRecord(value)
  ) {
    return false;
  }

  const code =
    Number(value.code);

  const message =
    getErrorMessage(
      value,
    )?.toLowerCase() ?? "";

  return (
    code === 429 ||
    message.includes(
      "api credits",
    ) ||
    message.includes(
      "rate limit",
    ) ||
    message.includes(
      "too many requests",
    )
  );
};

const calculateChange = (
  closes: number[],
  sessions: number,
): number | null => {
  if (
    closes.length <=
    sessions
  ) {
    return null;
  }

  const latestClose =
    closes.at(-1);

  const previousClose =
    closes[
      closes.length -
        1 -
        sessions
    ];

  if (
    latestClose ===
      undefined ||
    previousClose ===
      undefined ||
    previousClose <= 0
  ) {
    return null;
  }

  return round(
    (latestClose /
      previousClose -
      1) *
      100,
  );
};

const calculateDistance = (
  price: number,
  reference: number,
): number => {
  if (
    reference <= 0
  ) {
    return 0;
  }

  return round(
    (price /
      reference -
      1) *
      100,
  );
};

const determineTrend = (
  currentPrice: number,
  sma20: number,
  sma50: number,
  previousSma20: number,
  change1mPct: number | null,
): TrendDirection => {
  const shortAverageRising =
    sma20 >
    previousSma20;

  const shortAverageFalling =
    sma20 <
    previousSma20;

  const positiveMomentum =
    change1mPct !== null &&
    change1mPct > 0;

  const negativeMomentum =
    change1mPct !== null &&
    change1mPct < 0;

  if (
    currentPrice >
      sma20 &&
    sma20 >
      sma50 &&
    shortAverageRising &&
    positiveMomentum
  ) {
    return "Bullish";
  }

  if (
    currentPrice <
      sma20 &&
    sma20 <
      sma50 &&
    shortAverageFalling &&
    negativeMomentum
  ) {
    return "Bearish";
  }

  return "Sideways";
};

const createTrendResult = (
  symbol: string,
  bars: PriceBar[],
  updatedAt: string,
): WatchlistTrendResult | null => {
  if (
    bars.length <
    REQUIRED_BARS
  ) {
    return null;
  }

  const closes =
    bars.map(
      (bar) => bar.close,
    );

  const latestBar =
    bars.at(-1);

  if (!latestBar) {
    return null;
  }

  const sma20 =
    average(
      closes.slice(-20),
    );

  const sma50 =
    average(
      closes.slice(-50),
    );

  /*
   * Previous 20-session average,
   * ending five market sessions before
   * the latest available candle.
   */
  const previousSma20 =
    average(
      closes.slice(
        -25,
        -5,
      ),
    );

  const change1mPct =
    calculateChange(
      closes,
      21,
    );

  const change3mPct =
    calculateChange(
      closes,
      63,
    );

  const change6mPct =
    calculateChange(
      closes,
      126,
    );

  const change1yPct =
    calculateChange(
      closes,
      252,
    );

  const recentYearBars =
    bars.slice(
      -OUTPUT_SIZE,
    );

  const high52w =
    Math.max(
      ...recentYearBars.map(
        (bar) => bar.close,
      ),
    );

  const low52w =
    Math.min(
      ...recentYearBars.map(
        (bar) => bar.close,
      ),
    );

  const rangePosition52wPct =
    high52w >
    low52w
      ? round(
          ((latestBar.close -
            low52w) /
            (high52w -
              low52w)) *
            100,
        )
      : 50;

  return {
    symbol,

    currentPrice:
      round(
        latestBar.close,
      ),

    latestMarketDate:
      latestBar.date,

    change1mPct,
    change3mPct,
    change6mPct,
    change1yPct,

    sma20:
      round(sma20),

    sma50:
      round(sma50),

    distanceToSma20Pct:
      calculateDistance(
        latestBar.close,
        sma20,
      ),

    distanceToSma50Pct:
      calculateDistance(
        latestBar.close,
        sma50,
      ),

    high52w:
      round(high52w),

    low52w:
      round(low52w),

    rangePosition52wPct,

    trend:
      determineTrend(
        latestBar.close,
        sma20,
        sma50,
        previousSma20,
        change1mPct,
      ),

    points:
      recentYearBars.map(
        (bar) => ({
          date: bar.date,

          close:
            round(
              bar.close,
              4,
            ),
        }),
      ),

    updatedAt,
  };
};

export async function GET(
  request: Request,
): Promise<Response> {
  const apiKey =
    process.env
      .TWELVE_DATA_API_KEY
      ?.trim() ?? "";

  if (!apiKey) {
    return createJsonResponse(
      {
        message:
          "TWELVE_DATA_API_KEY is not configured.",
      },
      503,
    );
  }

  const requestUrl =
    new URL(request.url);

  const symbols =
    normalizeSymbols(
      requestUrl.searchParams.get(
        "symbols",
      ),
    );

  if (
    symbols.length === 0
  ) {
    return createJsonResponse(
      {
        message:
          "At least one valid watchlist symbol is required.",
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
          "A maximum of 8 watchlist symbols can be analyzed per request.",
      },
      400,
    );
  }

  const providerUrl =
    new URL(
      "https://api.twelvedata.com/time_series",
    );

  providerUrl.searchParams.set(
    "symbol",
    symbols.join(","),
  );

  providerUrl.searchParams.set(
    "interval",
    "1day",
  );

  providerUrl.searchParams.set(
    "outputsize",
    String(
      OUTPUT_SIZE,
    ),
  );

  providerUrl.searchParams.set(
    "order",
    "ASC",
  );

  /*
   * Daily prices are adjusted for
   * stock splits but not dividends.
   */
  providerUrl.searchParams.set(
    "adjust",
    "splits",
  );

  providerUrl.searchParams.set(
    "apikey",
    apiKey,
  );

  const controller =
    new AbortController();

  const timeoutId =
    setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

  try {
    const providerResponse =
      await fetch(
        providerUrl,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },

          signal:
            controller.signal,
        },
      );

    const providerText =
      await providerResponse.text();

    let providerData: unknown;

    try {
      providerData =
        JSON.parse(
          providerText,
        );
    } catch {
      return createJsonResponse(
        {
          message:
            "The market data provider returned invalid JSON.",
        },
        502,
      );
    }

    if (
      providerResponse.status ===
        429 ||
      isRateLimitError(
        providerData,
      )
    ) {
      return createJsonResponse(
        {
          message:
            getErrorMessage(
              providerData,
            ) ??
            "Twelve Data API credit limit reached.",
        },
        429,
      );
    }

    if (
      !providerResponse.ok
    ) {
      return createJsonResponse(
        {
          message:
            getErrorMessage(
              providerData,
            ) ??
            `Watchlist Trends failed with status ${providerResponse.status}.`,
        },
        502,
      );
    }

    if (
      !isRecord(
        providerData,
      )
    ) {
      return createJsonResponse(
        {
          message:
            "The market data provider returned an invalid response.",
        },
        502,
      );
    }

    const updatedAt =
      new Date().toISOString();

    const results:
      WatchlistTrendResult[] =
        [];

    const errors:
      Record<string, string> =
        {};

    let quotaErrorDetected =
      false;

    symbols.forEach(
      (symbol) => {
        const symbolResponse =
          symbols.length === 1 &&
          Array.isArray(
            providerData.values,
          )
            ? providerData
            : providerData[
                symbol
              ] ??
              providerData[
                symbol.toUpperCase()
              ] ??
              providerData[
                symbol.toLowerCase()
              ];

        if (
          isRateLimitError(
            symbolResponse,
          )
        ) {
          quotaErrorDetected =
            true;

          errors[symbol] =
            getErrorMessage(
              symbolResponse,
            ) ??
            "API credit limit reached.";

          return;
        }

        const bars =
          parseBars(
            symbolResponse,
          );

        if (
          bars.length <
          REQUIRED_BARS
        ) {
          errors[symbol] =
            getErrorMessage(
              symbolResponse,
            ) ??
            `Not enough historical data was returned for ${symbol}.`;

          return;
        }

        const result =
          createTrendResult(
            symbol,
            bars,
            updatedAt,
          );

        if (!result) {
          errors[symbol] =
            `Unable to calculate Watchlist Trends for ${symbol}.`;

          return;
        }

        results.push(
          result,
        );
      },
    );

    if (
      results.length ===
        0 &&
      quotaErrorDetected
    ) {
      return createJsonResponse(
        {
          message:
            "Twelve Data API credit limit reached.",

          errors,
        },
        429,
      );
    }

    if (
      results.length === 0
    ) {
      return createJsonResponse(
        {
          message:
            Object.values(
              errors,
            )[0] ??
            "No Watchlist Trends could be calculated.",

          errors,
        },
        502,
      );
    }

    const responseBody:
      WatchlistTrendResponse = {
        results,
        errors,
        updatedAt,
        source:
          "Twelve Data",
      };

    return createJsonResponse(
      responseBody,
      200,
    );
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      error.name ===
        "AbortError";

    return createJsonResponse(
      {
        message: timedOut
          ? "The Watchlist Trends request timed out."
          : error instanceof
              Error
            ? error.message
            : "Unable to update Watchlist Trends.",
      },
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(
      timeoutId,
    );
  }
}