type RawTimeSeriesBar = {
  datetime?: unknown;
  close?: unknown;
};

type PriceBar = {
  datetime: string;
  close: number;
};

type TrackingEntry = {
  id: string;
  symbol: string;
  entryDate: string;
  entryPrice: number;
};

type TrackingMilestone = {
  sessions: 5 | 10 | 20;
  date: string;
  price: number;
  returnPct: number;
};

type PaperTrackingResult = {
  id: string;
  symbol: string;
  entryDate: string;
  entryMarketDate: string | null;
  entryPrice: number;
  currentPrice: number;
  currentReturnPct: number;
  sessionsElapsed: number;
  marketDate: string;
  milestone5: TrackingMilestone | null;
  milestone10: TrackingMilestone | null;
  milestone20: TrackingMilestone | null;
  updatedAt: string;
};

type PaperTrackingResponse = {
  results: PaperTrackingResult[];
  errors: Record<string, string>;
  updatedAt: string;
  source: "Twelve Data";
};

const MAX_ENTRIES_PER_REQUEST = 8;
const REQUEST_TIMEOUT_MS = 20_000;
const MINIMUM_REQUIRED_BARS = 2;

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

const parsePositiveNumber = (
  value: unknown,
): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
};

const isValidDate = (
  value: string,
): boolean => {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  return !Number.isNaN(
    new Date(
      `${value}T00:00:00Z`,
    ).getTime(),
  );
};

const normalizeSymbol = (
  value: string,
): string => {
  return value
    .trim()
    .toUpperCase();
};

const parseEntries = (
  value: string | null,
): TrackingEntry[] => {
  if (!value) {
    return [];
  }

  let parsedValue: unknown;

  try {
    parsedValue =
      JSON.parse(value);
  } catch {
    return [];
  }

  if (
    !Array.isArray(parsedValue)
  ) {
    return [];
  }

  const entryMap =
    new Map<
      string,
      TrackingEntry
    >();

  parsedValue.forEach(
    (rawEntry) => {
      if (!isRecord(rawEntry)) {
        return;
      }

      const id =
        typeof rawEntry.id ===
          "string"
          ? rawEntry.id.trim()
          : "";

      const symbol =
        typeof rawEntry.symbol ===
          "string"
          ? normalizeSymbol(
              rawEntry.symbol,
            )
          : "";

      const entryDate =
        typeof rawEntry.entryDate ===
          "string"
          ? rawEntry.entryDate
              .trim()
              .slice(0, 10)
          : "";

      const entryPrice =
        parsePositiveNumber(
          rawEntry.entryPrice,
        );

      if (
        !id ||
        !symbol ||
        !/^[A-Z0-9.-]{1,15}$/.test(
          symbol,
        ) ||
        !isValidDate(
          entryDate,
        ) ||
        entryPrice === null
      ) {
        return;
      }

      entryMap.set(id, {
        id,
        symbol,
        entryDate,
        entryPrice,
      });
    },
  );

  return Array.from(
    entryMap.values(),
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
          !isRecord(rawValue)
        ) {
          return null;
        }

        const rawBar =
          rawValue as RawTimeSeriesBar;

        const datetime =
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
          !datetime ||
          !isValidDate(
            datetime,
          ) ||
          close === null
        ) {
          return null;
        }

        return {
          datetime,
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
        first.datetime.localeCompare(
          second.datetime,
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
  if (!isRecord(value)) {
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

const calculateReturn = (
  entryPrice: number,
  currentPrice: number,
): number => {
  if (entryPrice <= 0) {
    return 0;
  }

  return (
    (currentPrice /
      entryPrice -
      1) *
    100
  );
};

const subtractCalendarDays = (
  dateValue: string,
  days: number,
): string => {
  const date =
    new Date(
      `${dateValue}T00:00:00Z`,
    );

  date.setUTCDate(
    date.getUTCDate() -
      days,
  );

  return date
    .toISOString()
    .slice(0, 10);
};

const getEarliestEntryDate = (
  entries: TrackingEntry[],
): string => {
  return entries.reduce(
    (earliest, entry) => {
      if (
        !earliest ||
        entry.entryDate <
          earliest
      ) {
        return entry.entryDate;
      }

      return earliest;
    },
    "",
  );
};

const createMilestone = (
  bars: PriceBar[],
  entryIndex: number,
  entryPrice: number,
  sessions:
    | 5
    | 10
    | 20,
): TrackingMilestone | null => {
  const milestoneIndex =
    entryIndex + sessions;

  const milestoneBar =
    bars[milestoneIndex];

  if (!milestoneBar) {
    return null;
  }

  return {
    sessions,
    date:
      milestoneBar.datetime,

    price: round(
      milestoneBar.close,
    ),

    returnPct: round(
      calculateReturn(
        entryPrice,
        milestoneBar.close,
      ),
    ),
  };
};

const createTrackingResult = (
  entry: TrackingEntry,
  bars: PriceBar[],
  updatedAt: string,
): PaperTrackingResult | null => {
  if (
    bars.length <
    MINIMUM_REQUIRED_BARS
  ) {
    return null;
  }

  const latestBar =
    bars.at(-1);

  if (!latestBar) {
    return null;
  }

  const entryIndex =
    bars.findIndex(
      (bar) =>
        bar.datetime >=
        entry.entryDate,
    );

  /*
   * The entry date can be newer than
   * the latest daily candle while the
   * market is still open. In that case,
   * the paper trade remains at session 0.
   */
  if (entryIndex === -1) {
    return {
      id: entry.id,
      symbol: entry.symbol,
      entryDate:
        entry.entryDate,

      entryMarketDate: null,

      entryPrice: round(
        entry.entryPrice,
      ),

      currentPrice: round(
        entry.entryPrice,
      ),

      currentReturnPct: 0,
      sessionsElapsed: 0,

      marketDate:
        latestBar.datetime,

      milestone5: null,
      milestone10: null,
      milestone20: null,
      updatedAt,
    };
  }

  const sessionsElapsed =
    Math.max(
      bars.length -
        1 -
        entryIndex,
      0,
    );

  return {
    id: entry.id,
    symbol: entry.symbol,

    entryDate:
      entry.entryDate,

    entryMarketDate:
      bars[entryIndex]
        .datetime,

    entryPrice: round(
      entry.entryPrice,
    ),

    currentPrice: round(
      latestBar.close,
    ),

    currentReturnPct: round(
      calculateReturn(
        entry.entryPrice,
        latestBar.close,
      ),
    ),

    sessionsElapsed,

    marketDate:
      latestBar.datetime,

    milestone5:
      createMilestone(
        bars,
        entryIndex,
        entry.entryPrice,
        5,
      ),

    milestone10:
      createMilestone(
        bars,
        entryIndex,
        entry.entryPrice,
        10,
      ),

    milestone20:
      createMilestone(
        bars,
        entryIndex,
        entry.entryPrice,
        20,
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

  const entries =
    parseEntries(
      requestUrl.searchParams.get(
        "entries",
      ),
    );

  if (
    entries.length === 0
  ) {
    return createJsonResponse(
      {
        message:
          "At least one valid paper trade is required.",
      },
      400,
    );
  }

  if (
    entries.length >
    MAX_ENTRIES_PER_REQUEST
  ) {
    return createJsonResponse(
      {
        message:
          "A maximum of 8 paper trades can be updated per request.",
      },
      400,
    );
  }

  const symbols =
    Array.from(
      new Set(
        entries.map(
          (entry) =>
            entry.symbol,
        ),
      ),
    );

  const earliestEntryDate =
    getEarliestEntryDate(
      entries,
    );

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
    "start_date",
    subtractCalendarDays(
      earliestEntryDate,
      10,
    ),
  );

  providerUrl.searchParams.set(
    "outputsize",
    "500",
  );

  providerUrl.searchParams.set(
    "order",
    "ASC",
  );

  providerUrl.searchParams.set(
    "timezone",
    "America/New_York",
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
            `Paper tracking failed with status ${providerResponse.status}.`,
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

    const barsBySymbol =
      new Map<
        string,
        PriceBar[]
      >();

    const errors:
      Record<string, string> =
        {};

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
          MINIMUM_REQUIRED_BARS
        ) {
          errors[symbol] =
            getErrorMessage(
              symbolResponse,
            ) ??
            `Not enough historical data was returned for ${symbol}.`;

          return;
        }

        barsBySymbol.set(
          symbol,
          bars,
        );
      },
    );

    const results:
      PaperTrackingResult[] =
        [];

    entries.forEach(
      (entry) => {
        const bars =
          barsBySymbol.get(
            entry.symbol,
          );

        if (!bars) {
          return;
        }

        const result =
          createTrackingResult(
            entry,
            bars,
            updatedAt,
          );

        if (!result) {
          errors[
            entry.symbol
          ] =
            `Unable to calculate paper tracking for ${entry.symbol}.`;

          return;
        }

        results.push(
          result,
        );
      },
    );

    if (
      results.length === 0
    ) {
      const firstError =
        Object.values(
          errors,
        )[0];

      const rateLimited =
        Object.values(
          errors,
        ).some(
          (message) =>
            message
              .toLowerCase()
              .includes(
                "credit limit",
              ),
        );

      return createJsonResponse(
        {
          message:
            firstError ??
            "No paper trades could be updated.",

          errors,
        },
        rateLimited
          ? 429
          : 502,
      );
    }

    const responseBody:
      PaperTrackingResponse = {
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
          ? "The paper tracking request timed out."
          : error instanceof
              Error
            ? error.message
            : "Unable to update paper tracking.",
      },
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(
      timeoutId,
    );
  }
}