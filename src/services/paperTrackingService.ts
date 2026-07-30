export type PaperTrackingEntryRequest = {
  id: string;
  symbol: string;
  entryDate: string;
  entryPrice: number;
};

export type PaperTrackingMilestone = {
  sessions: 5 | 10 | 20;
  date: string;
  price: number;
  returnPct: number;
};

export type PaperTrackingResult = {
  id: string;
  symbol: string;
  entryDate: string;
  entryMarketDate: string | null;
  entryPrice: number;
  currentPrice: number;
  currentReturnPct: number;
  sessionsElapsed: number;
  marketDate: string;
  milestone5:
    | PaperTrackingMilestone
    | null;

  milestone10:
    | PaperTrackingMilestone
    | null;

  milestone20:
    | PaperTrackingMilestone
    | null;

  updatedAt: string;
};

export type PaperTrackingResponse = {
  results: PaperTrackingResult[];
  errors: Record<string, string>;
  updatedAt: string;
  source: "Twelve Data";
};

export class PaperTrackingRequestError extends Error {
  readonly status: number;

  constructor(
    message: string,
    status: number,
  ) {
    super(message);

    this.name =
      "PaperTrackingRequestError";

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

const isValidMilestone = (
  value: unknown,
): value is PaperTrackingMilestone => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.sessions === 5 ||
      value.sessions === 10 ||
      value.sessions === 20) &&
    typeof value.date ===
      "string" &&
    isFiniteNumber(
      value.price,
    ) &&
    isFiniteNumber(
      value.returnPct,
    )
  );
};

const isNullableMilestone = (
  value: unknown,
): value is
  | PaperTrackingMilestone
  | null => {
  return (
    value === null ||
    isValidMilestone(value)
  );
};

const isTrackingResult = (
  value: unknown,
): value is PaperTrackingResult => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id ===
      "string" &&
    typeof value.symbol ===
      "string" &&
    typeof value.entryDate ===
      "string" &&
    (value.entryMarketDate ===
      null ||
      typeof value.entryMarketDate ===
        "string") &&
    isFiniteNumber(
      value.entryPrice,
    ) &&
    isFiniteNumber(
      value.currentPrice,
    ) &&
    isFiniteNumber(
      value.currentReturnPct,
    ) &&
    isFiniteNumber(
      value.sessionsElapsed,
    ) &&
    typeof value.marketDate ===
      "string" &&
    isNullableMilestone(
      value.milestone5,
    ) &&
    isNullableMilestone(
      value.milestone10,
    ) &&
    isNullableMilestone(
      value.milestone20,
    ) &&
    typeof value.updatedAt ===
      "string"
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

const normalizeEntries = (
  entries:
    PaperTrackingEntryRequest[],
): PaperTrackingEntryRequest[] => {
  const entryMap =
    new Map<
      string,
      PaperTrackingEntryRequest
    >();

  entries.forEach(
    (entry) => {
      const id =
        entry.id.trim();

      const symbol =
        entry.symbol
          .trim()
          .toUpperCase();

      const entryDate =
        entry.entryDate
          .trim()
          .slice(0, 10);

      if (
        !id ||
        !symbol ||
        !Number.isFinite(
          entry.entryPrice,
        ) ||
        entry.entryPrice <= 0
      ) {
        return;
      }

      entryMap.set(id, {
        id,
        symbol,
        entryDate,
        entryPrice:
          entry.entryPrice,
      });
    },
  );

  return Array.from(
    entryMap.values(),
  );
};

export const fetchPaperTrackingBatch =
  async (
    entries:
      PaperTrackingEntryRequest[],
    signal?: AbortSignal,
  ): Promise<PaperTrackingResponse> => {
    const normalizedEntries =
      normalizeEntries(
        entries,
      );

    if (
      normalizedEntries.length ===
      0
    ) {
      throw new PaperTrackingRequestError(
        "There are no valid paper trades to update.",
        400,
      );
    }

    if (
      normalizedEntries.length >
      8
    ) {
      throw new PaperTrackingRequestError(
        "A maximum of 8 paper trades can be updated per request.",
        400,
      );
    }

    const searchParameters =
      new URLSearchParams({
        entries:
          JSON.stringify(
            normalizedEntries,
          ),
      });

    const response =
      await fetch(
        `/api/paper-tracking?${searchParameters.toString()}`,
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
      throw new PaperTrackingRequestError(
        "Paper Tracking returned an invalid response.",
        response.status,
      );
    }

    if (!response.ok) {
      throw new PaperTrackingRequestError(
        getResponseMessage(
          responseData,
        ) ??
          `Paper Tracking failed with status ${response.status}.`,
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
      throw new PaperTrackingRequestError(
        "Paper Tracking returned an invalid response.",
        502,
      );
    }

    const results =
      responseData.results.filter(
        isTrackingResult,
      );

    if (
      results.length === 0
    ) {
      throw new PaperTrackingRequestError(
        "No valid paper tracking results were returned.",
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