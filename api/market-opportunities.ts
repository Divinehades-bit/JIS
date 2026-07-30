type RawTimeSeriesBar = {
  datetime?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
  volume?: unknown;
};

type PriceBar = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type OpportunityScoreBreakdown = {
  trend: number;
  momentum: number;
  setup: number;
  volume: number;
  rsi: number;
  risk: number;
  penalty: number;
};

type MarketOpportunity = {
  symbol: string;
  price: number;
  score: number;
  rating:
    | "Strong research candidate"
    | "Watch closely"
    | "Neutral"
    | "Low priority";
  risk: "Low" | "Medium" | "High";
  setup:
    | "Breakout"
    | "Healthy pullback"
    | "Uptrend"
    | "Recovery"
    | "No clear setup";
  change10dPct: number;
  change20dPct: number;
  rsi14: number;
  sma20: number;
  sma50: number;
  volumeRatio: number;
  annualizedVolatilityPct: number;
  distanceToSma20Pct: number;
  distanceToHigh20Pct: number;
  scoreBreakdown: OpportunityScoreBreakdown;
  reasons: string[];
  warnings: string[];
  scannedAt: string;
};

type OpportunityApiResponse = {
  opportunities: MarketOpportunity[];
  errors: Record<string, string>;
  updatedAt: string;
  source: "Twelve Data";
};

const MAX_SYMBOLS_PER_REQUEST = 8;
const MINIMUM_REQUIRED_BARS = 55;
const REQUEST_TIMEOUT_MS = 20_000;

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const createJsonResponse = (
  body: unknown,
  status: number,
): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
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

const parsePositiveNumber = (
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

const parseNonNegativeNumber = (
  value: unknown,
): number => {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    return 0;
  }

  return parsedValue;
};

const getErrorMessage = (
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

const isRateLimitError = (
  value: unknown,
): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  const code = Number(value.code);
  const message = getErrorMessage(value)?.toLowerCase() ?? "";

  return (
    code === 429 ||
    message.includes("api credits") ||
    message.includes("rate limit") ||
    message.includes("too many requests")
  );
};

const round = (
  value: number,
  decimals = 2,
): number => {
  const multiplier = 10 ** decimals;

  return (
    Math.round((value + Number.EPSILON) * multiplier) /
    multiplier
  );
};

const clamp = (
  value: number,
  minimum: number,
  maximum: number,
): number => {
  return Math.min(Math.max(value, minimum), maximum);
};

const average = (
  values: number[],
): number => {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) => total + value,
      0,
    ) / values.length
  );
};

const parseBars = (
  value: unknown,
): PriceBar[] => {
  if (
    !isRecord(value) ||
    !Array.isArray(value.values)
  ) {
    return [];
  }

  return value.values
    .map((rawValue): PriceBar | null => {
      if (!isRecord(rawValue)) {
        return null;
      }

      const rawBar = rawValue as RawTimeSeriesBar;

      const datetime =
        typeof rawBar.datetime === "string"
          ? rawBar.datetime
          : "";

      const open = parsePositiveNumber(rawBar.open);
      const high = parsePositiveNumber(rawBar.high);
      const low = parsePositiveNumber(rawBar.low);
      const close = parsePositiveNumber(rawBar.close);

      if (
        !datetime ||
        open === null ||
        high === null ||
        low === null ||
        close === null
      ) {
        return null;
      }

      return {
        datetime,
        open,
        high,
        low,
        close,
        volume: parseNonNegativeNumber(rawBar.volume),
      };
    })
    .filter((bar): bar is PriceBar => bar !== null)
    .sort(
      (first, second) =>
        new Date(first.datetime).getTime() -
        new Date(second.datetime).getTime(),
    );
};

const calculateRsi = (
  closes: number[],
  period = 14,
): number => {
  if (closes.length <= period) {
    return 50;
  }

  const recentCloses = closes.slice(-(period + 1));

  let gains = 0;
  let losses = 0;

  for (
    let index = 1;
    index < recentCloses.length;
    index += 1
  ) {
    const change =
      recentCloses[index] - recentCloses[index - 1];

    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength =
    averageGain / averageLoss;

  return (
    100 -
    100 / (1 + relativeStrength)
  );
};

const calculateAnnualizedVolatility = (
  closes: number[],
): number => {
  const recentCloses = closes.slice(-21);

  if (recentCloses.length < 3) {
    return 0;
  }

  const returns: number[] = [];

  for (
    let index = 1;
    index < recentCloses.length;
    index += 1
  ) {
    returns.push(
      Math.log(
        recentCloses[index] /
          recentCloses[index - 1],
      ),
    );
  }

  const meanReturn = average(returns);

  const variance =
    returns.reduce((total, value) => {
      return total + (value - meanReturn) ** 2;
    }, 0) /
    Math.max(returns.length - 1, 1);

  return (
    Math.sqrt(variance) *
    Math.sqrt(252) *
    100
  );
};

const calculateChange = (
  closes: number[],
  sessions: number,
): number => {
  if (closes.length <= sessions) {
    return 0;
  }

  const latestClose = closes.at(-1) ?? 0;
  const previousClose =
    closes[closes.length - 1 - sessions];

  if (previousClose <= 0) {
    return 0;
  }

  return (
    (latestClose / previousClose - 1) *
    100
  );
};

const getMomentumPoints = (
  changePct: number,
): number => {
  if (changePct >= 10) {
    return 10;
  }

  if (changePct >= 5) {
    return 8;
  }

  if (changePct >= 2) {
    return 6;
  }

  if (changePct >= 0) {
    return 4;
  }

  if (changePct >= -3) {
    return 2;
  }

  return 0;
};

const getRsiPoints = (
  rsi: number,
): number => {
  if (rsi >= 45 && rsi <= 65) {
    return 10;
  }

  if (
    (rsi >= 35 && rsi < 45) ||
    (rsi > 65 && rsi <= 72)
  ) {
    return 7;
  }

  if (
    (rsi >= 30 && rsi < 35) ||
    (rsi > 72 && rsi <= 78)
  ) {
    return 4;
  }

  return 1;
};

const getVolumePoints = (
  volumeRatio: number,
): number => {
  if (volumeRatio >= 1.5) {
    return 15;
  }

  if (volumeRatio >= 1.2) {
    return 12;
  }

  if (volumeRatio >= 1) {
    return 8;
  }

  if (volumeRatio >= 0.8) {
    return 5;
  }

  return 2;
};

const getRiskPoints = (
  volatility: number,
): number => {
  if (volatility <= 25) {
    return 10;
  }

  if (volatility <= 35) {
    return 8;
  }

  if (volatility <= 45) {
    return 5;
  }

  if (volatility <= 60) {
    return 3;
  }

  return 1;
};

const createOpportunity = (
  symbol: string,
  bars: PriceBar[],
  scannedAt: string,
): MarketOpportunity | null => {
  if (bars.length < MINIMUM_REQUIRED_BARS) {
    return null;
  }

  const closes = bars.map((bar) => bar.close);
  const latestBar = bars.at(-1);

  if (!latestBar) {
    return null;
  }

  const recent20Bars = bars.slice(-20);
  const previous20Bars = bars.slice(-21, -1);

  const sma20 = average(closes.slice(-20));
  const sma50 = average(closes.slice(-50));

  const rsi14 = calculateRsi(closes);
  const change10dPct = calculateChange(closes, 10);
  const change20dPct = calculateChange(closes, 20);

  const averageVolume20 = average(
    previous20Bars.map((bar) => bar.volume),
  );

  const volumeRatio =
    averageVolume20 > 0
      ? latestBar.volume / averageVolume20
      : 1;

  const high20 = Math.max(
    ...recent20Bars.map((bar) => bar.high),
  );

  const distanceToSma20Pct =
    (latestBar.close / sma20 - 1) * 100;

  const distanceToHigh20Pct =
    (latestBar.close / high20 - 1) * 100;

  const annualizedVolatilityPct =
    calculateAnnualizedVolatility(closes);

  const aboveSma20 =
    latestBar.close > sma20;

  const aboveSma50 =
    latestBar.close > sma50;

  const movingAveragesAligned =
    sma20 > sma50;

  const uptrend =
    aboveSma50 &&
    movingAveragesAligned;

  let trendScore = 0;

  if (aboveSma20) {
    trendScore += 8;
  }

  if (movingAveragesAligned) {
    trendScore += 10;
  }

  if (aboveSma50) {
    trendScore += 7;
  }

  const momentumScore =
    getMomentumPoints(change10dPct) +
    getMomentumPoints(change20dPct);

  const breakout =
    uptrend &&
    distanceToHigh20Pct >= -1.5 &&
    volumeRatio >= 1.1;

  const healthyPullback =
    uptrend &&
    Math.abs(distanceToSma20Pct) <= 2.5 &&
    rsi14 >= 40 &&
    rsi14 <= 65;

  const recovery =
    latestBar.close > sma20 &&
    sma20 <= sma50 &&
    change10dPct > 0;

  let setupScore = 3;

  let setup: MarketOpportunity["setup"] =
    "No clear setup";

  if (breakout) {
    setupScore = 20;
    setup = "Breakout";
  } else if (healthyPullback) {
    setupScore = 18;
    setup = "Healthy pullback";
  } else if (uptrend) {
    setupScore = 12;
    setup = "Uptrend";
  } else if (recovery) {
    setupScore = 8;
    setup = "Recovery";
  }

  const volumeScore =
    getVolumePoints(volumeRatio);

  const rsiScore =
    getRsiPoints(rsi14);

  const riskScore =
    getRiskPoints(annualizedVolatilityPct);

  let penalty = 0;

  if (rsi14 > 78) {
    penalty += 8;
  }

  if (distanceToSma20Pct > 10) {
    penalty += 5;
  }

  if (change20dPct > 25) {
    penalty += 4;
  }

  penalty = Math.min(penalty, 12);

  const score = clamp(
    Math.round(
      trendScore +
        momentumScore +
        setupScore +
        volumeScore +
        rsiScore +
        riskScore -
        penalty,
    ),
    0,
    100,
  );

  let rating: MarketOpportunity["rating"] =
    "Low priority";

  if (score >= 80) {
    rating = "Strong research candidate";
  } else if (score >= 65) {
    rating = "Watch closely";
  } else if (score >= 50) {
    rating = "Neutral";
  }

  let risk: MarketOpportunity["risk"] =
    "High";

  if (annualizedVolatilityPct <= 25) {
    risk = "Low";
  } else if (annualizedVolatilityPct <= 45) {
    risk = "Medium";
  }

  const reasons: string[] = [];

  if (breakout) {
    reasons.push(
      "Near a 20-day breakout with stronger volume.",
    );
  } else if (healthyPullback) {
    reasons.push(
      "Healthy pullback near the 20-day average.",
    );
  }

  if (uptrend) {
    reasons.push(
      "Price and moving averages show an upward trend.",
    );
  }

  if (
    change10dPct > 0 &&
    change20dPct > 0
  ) {
    reasons.push(
      "Momentum is positive over 10 and 20 sessions.",
    );
  }

  if (volumeRatio >= 1.2) {
    reasons.push(
      "Trading volume is above its recent average.",
    );
  }

  if (
    rsi14 >= 45 &&
    rsi14 <= 65
  ) {
    reasons.push(
      "RSI is in a balanced momentum zone.",
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "No strong technical catalyst is currently visible.",
    );
  }

  const warnings: string[] = [];

  if (annualizedVolatilityPct > 45) {
    warnings.push(
      "Price volatility is high.",
    );
  }

  if (rsi14 > 72) {
    warnings.push(
      "The stock may be technically overextended.",
    );
  }

  if (latestBar.close < sma50) {
    warnings.push(
      "Price remains below its 50-day average.",
    );
  }

  if (change20dPct < -5) {
    warnings.push(
      "Twenty-session momentum is negative.",
    );
  }

  return {
    symbol,
    price: round(latestBar.close),
    score,
    rating,
    risk,
    setup,
    change10dPct: round(change10dPct),
    change20dPct: round(change20dPct),
    rsi14: round(rsi14),
    sma20: round(sma20),
    sma50: round(sma50),
    volumeRatio: round(volumeRatio),
    annualizedVolatilityPct: round(
      annualizedVolatilityPct,
    ),
    distanceToSma20Pct: round(
      distanceToSma20Pct,
    ),
    distanceToHigh20Pct: round(
      distanceToHigh20Pct,
    ),
    scoreBreakdown: {
      trend: trendScore,
      momentum: momentumScore,
      setup: setupScore,
      volume: volumeScore,
      rsi: rsiScore,
      risk: riskScore,
      penalty,
    },
    reasons: reasons.slice(0, 4),
    warnings,
    scannedAt,
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

  if (symbols.length > MAX_SYMBOLS_PER_REQUEST) {
    return createJsonResponse(
      {
        message:
          "A maximum of 8 symbols can be analyzed per request.",
      },
      400,
    );
  }

  const providerUrl = new URL(
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
    "90",
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

    if (
      providerResponse.status === 429 ||
      isRateLimitError(providerData)
    ) {
      return createJsonResponse(
        {
          message:
            getErrorMessage(providerData) ??
            "Twelve Data API credit limit reached.",
        },
        429,
      );
    }

    if (!providerResponse.ok) {
      return createJsonResponse(
        {
          message:
            getErrorMessage(providerData) ??
            `Market analysis failed with status ${providerResponse.status}.`,
        },
        502,
      );
    }

    if (!isRecord(providerData)) {
      return createJsonResponse(
        {
          message:
            "The market data provider returned an invalid response.",
        },
        502,
      );
    }

    const scannedAt =
      new Date().toISOString();

    const opportunities: MarketOpportunity[] = [];
    const errors: Record<string, string> = {};

    let quotaErrorDetected = false;

    symbols.forEach((symbol) => {
      const symbolResponse =
        symbols.length === 1 &&
        Array.isArray(providerData.values)
          ? providerData
          : providerData[symbol] ??
            providerData[symbol.toUpperCase()] ??
            providerData[symbol.toLowerCase()];

      if (isRateLimitError(symbolResponse)) {
        quotaErrorDetected = true;

        errors[symbol] =
          getErrorMessage(symbolResponse) ??
          "API credit limit reached.";

        return;
      }

      const bars = parseBars(symbolResponse);

      if (bars.length < MINIMUM_REQUIRED_BARS) {
        errors[symbol] =
          getErrorMessage(symbolResponse) ??
          `Not enough historical data was returned for ${symbol}.`;

        return;
      }

      const opportunity =
        createOpportunity(
          symbol,
          bars,
          scannedAt,
        );

      if (!opportunity) {
        errors[symbol] =
          `Unable to calculate technical metrics for ${symbol}.`;

        return;
      }

      opportunities.push(opportunity);
    });

    if (
      opportunities.length === 0 &&
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

    if (opportunities.length === 0) {
      return createJsonResponse(
        {
          message:
            Object.values(errors)[0] ??
            "No valid market opportunities were returned.",
          errors,
        },
        502,
      );
    }

    const responseBody: OpportunityApiResponse = {
      opportunities,
      errors,
      updatedAt: scannedAt,
      source: "Twelve Data",
    };

    return createJsonResponse(
      responseBody,
      200,
    );
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      error.name === "AbortError";

    return createJsonResponse(
      {
        message: timedOut
          ? "The market analysis request timed out."
          : error instanceof Error
            ? error.message
            : "Unable to analyze market opportunities.",
      },
      timedOut ? 504 : 502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}