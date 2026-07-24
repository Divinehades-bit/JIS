import { create } from "zustand";
import useCashStore from "./cashStore";

export const DIVIDEND_STORAGE_KEY =
  "jis-dividends";

export type DividendRecord = {
  id: string;

  symbol: string;

  paymentDate: string;

  grossAmount: number;

  withholdingRate: number;

  taxWithheld: number;

  netAmount: number;

  currency: "USD";

  cashAccountId: string;

  cashAccountName: string;

  note?: string;

  source: "manual";

  createdAt: string;

  updatedAt: string;
};

export type AddDividendInput = {
  symbol: string;

  paymentDate: string;

  grossAmount: number;

  withholdingRate: number;

  cashAccountId: string;

  note?: string;
};

export type DividendActionResult = {
  success: boolean;
  error?: string;
};

type StoredDividendData = {
  version: 1;

  defaultWithholdingRate: number;

  records: DividendRecord[];
};

type DividendStore = {
  records: DividendRecord[];

  defaultWithholdingRate: number;

  setDefaultWithholdingRate: (
    rate: number,
  ) => DividendActionResult;

  recordDividend: (
    input: AddDividendInput,
  ) => DividendActionResult;

  reverseDividend: (
    dividendId: string,
  ) => DividendActionResult;
};

const DEFAULT_WITHHOLDING_RATE = 30;

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

const normalizeNonNegativeNumber = (
  value: unknown,
): number | null => {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
};

const normalizeRate = (
  value: unknown,
): number | null => {
  const parsed =
    normalizeNonNegativeNumber(
      value,
    );

  if (
    parsed === null ||
    parsed > 100
  ) {
    return null;
  }

  return parsed;
};

const normalizeDate = (
  value: unknown,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date.toISOString();
};

const createDividendId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const normalizeDividendRecord = (
  value: unknown,
): DividendRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string"
      ? value.id.trim()
      : "";

  const symbol =
    typeof value.symbol === "string"
      ? value.symbol
          .trim()
          .toUpperCase()
      : "";

  const paymentDate =
    normalizeDate(
      value.paymentDate,
    );

  const grossAmount =
    normalizePositiveNumber(
      value.grossAmount,
    );

  const withholdingRate =
    normalizeRate(
      value.withholdingRate,
    );

  const taxWithheld =
    normalizeNonNegativeNumber(
      value.taxWithheld,
    );

  const netAmount =
    normalizeNonNegativeNumber(
      value.netAmount,
    );

  const cashAccountId =
    typeof value.cashAccountId ===
      "string"
      ? value.cashAccountId.trim()
      : "";

  const cashAccountName =
    typeof value.cashAccountName ===
      "string"
      ? value.cashAccountName.trim()
      : "";

  const createdAt =
    normalizeDate(
      value.createdAt,
    );

  const updatedAt =
    normalizeDate(
      value.updatedAt,
    );

  const note =
    typeof value.note === "string" &&
    value.note.trim()
      ? value.note.trim()
      : undefined;

  if (
    !id ||
    !symbol ||
    !paymentDate ||
    grossAmount === null ||
    withholdingRate === null ||
    taxWithheld === null ||
    netAmount === null ||
    !cashAccountId ||
    !cashAccountName ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    symbol,
    paymentDate,
    grossAmount,
    withholdingRate,
    taxWithheld,
    netAmount,
    currency: "USD",
    cashAccountId,
    cashAccountName,
    note,
    source: "manual",
    createdAt,
    updatedAt,
  };
};

const saveDividendData = (
  records: DividendRecord[],
  defaultWithholdingRate: number,
) => {
  const data:
    StoredDividendData = {
    version: 1,
    defaultWithholdingRate,
    records,
  };

  try {
    localStorage.setItem(
      DIVIDEND_STORAGE_KEY,
      JSON.stringify(data),
    );
  } catch (error) {
    console.error(
      "Unable to save dividends:",
      error,
    );
  }
};

const loadDividendData =
  (): StoredDividendData => {
    try {
      const stored =
        localStorage.getItem(
          DIVIDEND_STORAGE_KEY,
        );

      if (!stored) {
        return {
          version: 1,

          defaultWithholdingRate:
            DEFAULT_WITHHOLDING_RATE,

          records: [],
        };
      }

      const parsed: unknown =
        JSON.parse(stored);

      if (!isRecord(parsed)) {
        throw new Error(
          "Invalid dividend storage.",
        );
      }

      const rawRecords =
        Array.isArray(
          parsed.records,
        )
          ? parsed.records
          : [];

      const records =
        rawRecords
          .map(
            normalizeDividendRecord,
          )
          .filter(
            (
              record,
            ): record is DividendRecord =>
              record !== null,
          )
          .sort(
            (first, second) =>
              new Date(
                second.paymentDate,
              ).getTime() -
              new Date(
                first.paymentDate,
              ).getTime(),
          );

      const rate =
        normalizeRate(
          parsed.defaultWithholdingRate,
        ) ??
        DEFAULT_WITHHOLDING_RATE;

      return {
        version: 1,
        defaultWithholdingRate:
          rate,
        records,
      };
    } catch (error) {
      console.error(
        "Unable to load dividends:",
        error,
      );

      return {
        version: 1,

        defaultWithholdingRate:
          DEFAULT_WITHHOLDING_RATE,

        records: [],
      };
    }
  };

const initialData =
  loadDividendData();

const useDividendStore =
  create<DividendStore>(
    (set, get) => ({
      records:
        initialData.records,

      defaultWithholdingRate:
        initialData.defaultWithholdingRate,

      setDefaultWithholdingRate: (
        rate,
      ) => {
        const normalized =
          normalizeRate(rate);

        if (normalized === null) {
          return {
            success: false,

            error:
              "Withholding rate must be between 0% and 100%.",
          };
        }

        saveDividendData(
          get().records,
          normalized,
        );

        set({
          defaultWithholdingRate:
            normalized,
        });

        return {
          success: true,
        };
      },

      recordDividend: (
        input,
      ) => {
        const symbol =
          input.symbol
            .trim()
            .toUpperCase();

        const grossAmount =
          normalizePositiveNumber(
            input.grossAmount,
          );

        const withholdingRate =
          normalizeRate(
            input.withholdingRate,
          );

        const paymentDate =
          normalizeDate(
            input.paymentDate,
          );

        if (!symbol) {
          return {
            success: false,
            error:
              "Dividend symbol is required.",
          };
        }

        if (
          grossAmount === null
        ) {
          return {
            success: false,
            error:
              "Gross dividend must be greater than zero.",
          };
        }

        if (
          withholdingRate === null
        ) {
          return {
            success: false,
            error:
              "Withholding rate must be between 0% and 100%.",
          };
        }

        if (!paymentDate) {
          return {
            success: false,
            error:
              "Enter a valid payment date.",
          };
        }

        const cashAccount =
          useCashStore
            .getState()
            .accounts.find(
              (account) =>
                account.id ===
                input.cashAccountId,
            );

        if (!cashAccount) {
          return {
            success: false,
            error:
              "Cash destination not found.",
          };
        }

        if (
          cashAccount.currency !==
          "USD"
        ) {
          return {
            success: false,
            error:
              "Investment dividends currently require a USD cash account.",
          };
        }

        const taxWithheld =
          grossAmount *
          (withholdingRate / 100);

        const netAmount =
          grossAmount -
          taxWithheld;

        if (
          !Number.isFinite(
            netAmount,
          ) ||
          netAmount < 0
        ) {
          return {
            success: false,
            error:
              "Unable to calculate the net dividend.",
          };
        }

        /*
         * Create the dividend ID
         * BEFORE depositing the cash
         * so both records can be linked.
         */
        const dividendId =
          createDividendId();

        const cashResult =
          useCashStore
            .getState()
            .adjustAccountBalance(
              cashAccount.id,
              netAmount,
              {
                type: "dividend",

                date:
                  paymentDate,

                relatedId:
                  dividendId,

                symbol,

                note:
                  input.note?.trim() ||
                  "ETF dividend",
              },
            );

        if (!cashResult.success) {
          return {
            success: false,

            error:
              cashResult.error ??
              "Unable to deposit the dividend into cash.",
          };
        }

        const now =
          new Date().toISOString();

        const dividend:
          DividendRecord = {
          id: dividendId,

          symbol,

          paymentDate,

          grossAmount,

          withholdingRate,

          taxWithheld,

          netAmount,

          currency: "USD",

          cashAccountId:
            cashAccount.id,

          cashAccountName:
            cashAccount.name,

          note:
            input.note?.trim() ||
            undefined,

          source: "manual",

          createdAt: now,

          updatedAt: now,
        };

        const nextRecords = [
          dividend,
          ...get().records,
        ].sort(
          (first, second) =>
            new Date(
              second.paymentDate,
            ).getTime() -
            new Date(
              first.paymentDate,
            ).getTime(),
        );

        saveDividendData(
          nextRecords,
          get()
            .defaultWithholdingRate,
        );

        set({
          records:
            nextRecords,
        });

        return {
          success: true,
        };
      },

      reverseDividend: (
        dividendId,
      ) => {
        const record =
          get().records.find(
            (item) =>
              item.id ===
              dividendId,
          );

        if (!record) {
          return {
            success: false,
            error:
              "Dividend record not found.",
          };
        }

        const cashAccount =
          useCashStore
            .getState()
            .accounts.find(
              (account) =>
                account.id ===
                record.cashAccountId,
            );

        if (!cashAccount) {
          return {
            success: false,

            error:
              "The original cash account no longer exists.",
          };
        }

        /*
         * Reversal remains visible in
         * the Cash Ledger as an
         * adjustment, preserving the
         * audit trail.
         */
        const cashResult =
          useCashStore
            .getState()
            .adjustAccountBalance(
              cashAccount.id,
              -record.netAmount,
              {
                type: "adjustment",

                date:
                  new Date().toISOString(),

                relatedId:
                  record.id,

                symbol:
                  record.symbol,

                note:
                  `Reversal of ${record.symbol} dividend`,
              },
            );

        if (!cashResult.success) {
          return {
            success: false,

            error:
              "JIS cannot reverse this dividend because the destination account no longer has enough available cash.",
          };
        }

        const nextRecords =
          get().records.filter(
            (item) =>
              item.id !==
              dividendId,
          );

        saveDividendData(
          nextRecords,
          get()
            .defaultWithholdingRate,
        );

        set({
          records:
            nextRecords,
        });

        return {
          success: true,
        };
      },
    }),
  );

export default useDividendStore;