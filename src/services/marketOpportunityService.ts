export type OpportunityRating =
  | "Strong research candidate"
  | "Watch closely"
  | "Neutral"
  | "Low priority";

export type OpportunityRisk =
  | "Low"
  | "Medium"
  | "High";

export type OpportunitySetup =
  | "Breakout"
  | "Healthy pullback"
  | "Uptrend"
  | "Recovery"
  | "No clear setup";

export type OpportunityScoreBreakdown = {
  trend: number;
  momentum: number;
  setup: number;
  volume: number;
  rsi: number;
  risk: number;
  penalty: number;
};

export type MarketOpportunity = {
  symbol: string;
  price: number;
  score: number;
  rating: OpportunityRating;
  risk: OpportunityRisk;
  setup: OpportunitySetup;
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

export type MarketOpportunityResponse = {
  opportunities: MarketOpportunity[];
  errors: Record<string, string>;
  updatedAt: string;
  source: "Twelve Data";
};

export class MarketOpportunityRequestError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name =
      "MarketOpportunityRequestError";

    this.status = status;
  }
}

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isFiniteNumber = (
  value: unknown,
): value is number => {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
};

const isStringArray = (
  value: unknown,
): value is string[] => {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string",
    )
  );
};

const isMarketOpportunity = (
  value: unknown,
): value is MarketOpportunity => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.symbol === "string" &&
    isFiniteNumber(value.price) &&
    isFiniteNumber(value.score) &&
    typeof value.rating === "string" &&
    typeof value.risk === "string" &&
    typeof value.setup === "string" &&
    isFiniteNumber(value.change10dPct) &&
    isFiniteNumber(value.change20dPct) &&
    isFiniteNumber(value.rsi14) &&
    isFiniteNumber(value.sma20) &&
    isFiniteNumber(value.sma50) &&
    isFiniteNumber(value.volumeRatio) &&
    isFiniteNumber(
      value.annualizedVolatilityPct,
    ) &&
    isFiniteNumber(
      value.distanceToSma20Pct,
    ) &&
    isFiniteNumber(
      value.distanceToHigh20Pct,
    ) &&
    isRecord(value.scoreBreakdown) &&
    isStringArray(value.reasons) &&
    isStringArray(value.warnings) &&
    typeof value.scannedAt === "string"
  );
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

const normalizeErrors = (
  value: unknown,
): Record<string, string> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<
    Record<string, string>
  >((errors, [symbol, message]) => {
    if (
      typeof message === "string" &&
      message.trim()
    ) {
      errors[symbol.toUpperCase()] =
        message.trim();
    }

    return errors;
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

export const fetchMarketOpportunityBatch =
  async (
    symbols: string[],
    signal?: AbortSignal,
  ): Promise<MarketOpportunityResponse> => {
    const normalizedSymbols =
      normalizeSymbols(symbols);

    if (normalizedSymbols.length === 0) {
      throw new MarketOpportunityRequestError(
        "There are no symbols to analyze.",
        400,
      );
    }

    if (normalizedSymbols.length > 8) {
      throw new MarketOpportunityRequestError(
        "A maximum of 8 symbols can be analyzed per request.",
        400,
      );
    }

    const searchParameters =
      new URLSearchParams({
        symbols:
          normalizedSymbols.join(","),
      });

    const response = await fetch(
      `/api/market-opportunities?${searchParameters.toString()}`,
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
      responseData =
        await response.json();
    } catch {
      throw new MarketOpportunityRequestError(
        "The market scanner returned an invalid response.",
        response.status,
      );
    }

    if (!response.ok) {
      throw new MarketOpportunityRequestError(
        getResponseMessage(responseData) ??
          `The market scanner failed with status ${response.status}.`,
        response.status,
      );
    }

    if (
      !isRecord(responseData) ||
      !Array.isArray(
        responseData.opportunities,
      )
    ) {
      throw new MarketOpportunityRequestError(
        "The market scanner returned an invalid response.",
        502,
      );
    }

    const opportunities =
      responseData.opportunities.filter(
        isMarketOpportunity,
      );

    if (opportunities.length === 0) {
      throw new MarketOpportunityRequestError(
        "No valid opportunities were returned.",
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
      opportunities,
      errors: normalizeErrors(
        responseData.errors,
      ),
      updatedAt,
      source: "Twelve Data",
    };
  };