import { create } from "zustand";
import { fetchFxRates } from "../services/fxRateService";
import {
  isSupportedCurrency,
  type CurrencyCode,
} from "./settingsStore";

export type CashAccount = {
  id: string;
  name: string;
  institution?: string;
  currency: CurrencyCode;
  balance: number;
  annualYield: number;
  createdAt: string;
  updatedAt: string;
};

export type CashAccountInput = {
  name: string;
  institution?: string;
  currency: CurrencyCode;
  balance: number;
  annualYield: number;
};

export type CashActionResult = {
  success: boolean;
  error?: string;
};

export type FxSyncStatus =
  | "idle"
  | "loading"
  | "success"
  | "error";

export type FxRefreshResult = {
  success: boolean;
  errors: Partial<
    Record<CurrencyCode, string>
  >;
  error?: string;
};

type StoredFxData = {
  baseCurrency: CurrencyCode;
  rates: Partial<
    Record<CurrencyCode, number>
  >;
  updatedAt: string;
};

type CashStore = {
  accounts: CashAccount[];

  fxBaseCurrency: CurrencyCode | null;

  fxRates: Partial<
    Record<CurrencyCode, number>
  >;

  fxUpdatedAt: string | null;
  fxSyncStatus: FxSyncStatus;
  fxSyncError: string | null;

  addAccount: (
    input: CashAccountInput,
  ) => CashActionResult;

  updateAccount: (
    id: string,
    input: CashAccountInput,
  ) => CashActionResult;

  removeAccount: (id: string) => void;

  refreshFxRates: (
    baseCurrency: CurrencyCode,
  ) => Promise<FxRefreshResult>;
};

export const CASH_ACCOUNTS_STORAGE_KEY =
  "jis-cash-accounts";

export const CASH_FX_STORAGE_KEY =
  "jis-cash-fx-rates";

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizePositiveNumber = (
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

const normalizeYield = (
  value: unknown,
): number | null => {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0 ||
    parsedValue > 100
  ) {
    return null;
  }

  return parsedValue;
};

const normalizeIsoDate = (
  value: unknown,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
};

const createAccountId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const normalizeAccount = (
  value: unknown,
): CashAccount | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string"
      ? value.id.trim()
      : "";

  const name =
    typeof value.name === "string"
      ? value.name.trim()
      : "";

  const institution =
    typeof value.institution === "string" &&
    value.institution.trim()
      ? value.institution.trim()
      : undefined;

  const currency = isSupportedCurrency(
    value.currency,
  )
    ? value.currency
    : null;

  const balance = normalizePositiveNumber(
    value.balance,
  );

  const annualYield = normalizeYield(
    value.annualYield,
  );

  const createdAt = normalizeIsoDate(
    value.createdAt,
  );

  const updatedAt = normalizeIsoDate(
    value.updatedAt,
  );

  if (
    !id ||
    !name ||
    !currency ||
    balance === null ||
    annualYield === null ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id,
    name,
    institution,
    currency,
    balance,
    annualYield,
    createdAt,
    updatedAt,
  };
};

const saveAccounts = (
  accounts: CashAccount[],
) => {
  try {
    localStorage.setItem(
      CASH_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(accounts),
    );
  } catch (error) {
    console.error(
      "Unable to save cash accounts:",
      error,
    );
  }
};

const loadAccounts = (): CashAccount[] => {
  try {
    const storedAccounts =
      localStorage.getItem(
        CASH_ACCOUNTS_STORAGE_KEY,
      );

    if (!storedAccounts) {
      return [];
    }

    const parsedAccounts: unknown =
      JSON.parse(storedAccounts);

    if (!Array.isArray(parsedAccounts)) {
      saveAccounts([]);

      return [];
    }

    const normalizedAccounts =
      parsedAccounts
        .map(normalizeAccount)
        .filter(
          (
            account,
          ): account is CashAccount =>
            account !== null,
        );

    saveAccounts(normalizedAccounts);

    return normalizedAccounts;
  } catch (error) {
    console.error(
      "Unable to load cash accounts:",
      error,
    );

    return [];
  }
};

const normalizeRates = (
  value: unknown,
): Partial<Record<CurrencyCode, number>> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<
    Partial<Record<CurrencyCode, number>>
  >((accumulator, [currency, rawRate]) => {
    if (!isSupportedCurrency(currency)) {
      return accumulator;
    }

    const rate = normalizePositiveNumber(
      rawRate,
    );

    if (rate !== null) {
      accumulator[currency] = rate;
    }

    return accumulator;
  }, {});
};

const saveFxData = (
  fxData: StoredFxData,
) => {
  try {
    localStorage.setItem(
      CASH_FX_STORAGE_KEY,
      JSON.stringify(fxData),
    );
  } catch (error) {
    console.error(
      "Unable to save FX rates:",
      error,
    );
  }
};

const loadFxData = (): StoredFxData | null => {
  try {
    const storedFxData =
      localStorage.getItem(
        CASH_FX_STORAGE_KEY,
      );

    if (!storedFxData) {
      return null;
    }

    const parsedFxData: unknown =
      JSON.parse(storedFxData);

    if (!isRecord(parsedFxData)) {
      return null;
    }

    const baseCurrency =
      isSupportedCurrency(
        parsedFxData.baseCurrency,
      )
        ? parsedFxData.baseCurrency
        : null;

    const updatedAt = normalizeIsoDate(
      parsedFxData.updatedAt,
    );

    const rates = normalizeRates(
      parsedFxData.rates,
    );

    if (!baseCurrency || !updatedAt) {
      return null;
    }

    return {
      baseCurrency,
      rates,
      updatedAt,
    };
  } catch (error) {
    console.error(
      "Unable to load FX rates:",
      error,
    );

    return null;
  }
};

const normalizeInput = (
  input: CashAccountInput,
): CashAccountInput | null => {
  const name = input.name.trim();

  const institution =
    input.institution?.trim() || undefined;

  const balance = normalizePositiveNumber(
    input.balance,
  );

  const annualYield = normalizeYield(
    input.annualYield,
  );

  if (
    !name ||
    name.length > 60 ||
    !isSupportedCurrency(input.currency) ||
    balance === null ||
    annualYield === null
  ) {
    return null;
  }

  return {
    name,
    institution,
    currency: input.currency,
    balance,
    annualYield,
  };
};

const initialFxData = loadFxData();

const useCashStore = create<CashStore>(
  (set, get) => ({
    accounts: loadAccounts(),

    fxBaseCurrency:
      initialFxData?.baseCurrency ?? null,

    fxRates: initialFxData?.rates ?? {},

    fxUpdatedAt:
      initialFxData?.updatedAt ?? null,

    fxSyncStatus: "idle",

    fxSyncError: null,

    addAccount: (input) => {
      const normalizedInput =
        normalizeInput(input);

      if (!normalizedInput) {
        return {
          success: false,
          error:
            "Enter valid cash account information.",
        };
      }

      const now = new Date().toISOString();

      const nextAccount: CashAccount = {
        id: createAccountId(),
        ...normalizedInput,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        const nextAccounts = [
          ...state.accounts,
          nextAccount,
        ];

        saveAccounts(nextAccounts);

        return {
          accounts: nextAccounts,
        };
      });

      return {
        success: true,
      };
    },

    updateAccount: (id, input) => {
      const normalizedInput =
        normalizeInput(input);

      if (!normalizedInput) {
        return {
          success: false,
          error:
            "Enter valid cash account information.",
        };
      }

      const existingAccount =
        get().accounts.find(
          (account) => account.id === id,
        );

      if (!existingAccount) {
        return {
          success: false,
          error: "Cash account not found.",
        };
      }

      set((state) => {
        const nextAccounts =
          state.accounts.map((account) =>
            account.id === id
              ? {
                  ...account,
                  ...normalizedInput,
                  updatedAt:
                    new Date().toISOString(),
                }
              : account,
          );

        saveAccounts(nextAccounts);

        return {
          accounts: nextAccounts,
        };
      });

      return {
        success: true,
      };
    },

    removeAccount: (id) => {
      set((state) => {
        const nextAccounts =
          state.accounts.filter(
            (account) => account.id !== id,
          );

        saveAccounts(nextAccounts);

        return {
          accounts: nextAccounts,
        };
      });
    },

    refreshFxRates: async (
      baseCurrency,
    ) => {
      if (
        get().fxSyncStatus === "loading"
      ) {
        return {
          success: false,
          errors: {},
          error:
            "An exchange-rate update is already running.",
        };
      }

      const currencies = Array.from(
        new Set(
          get().accounts.map(
            (account) => account.currency,
          ),
        ),
      );

      set({
        fxSyncStatus: "loading",
        fxSyncError: null,
      });

      try {
        const response = await fetchFxRates(
          currencies,
          baseCurrency,
        );

        const failedCurrencies =
          Object.keys(response.errors);

        const partialError =
          failedCurrencies.length > 0
            ? `Some currencies were not updated: ${failedCurrencies.join(
                ", ",
              )}.`
            : null;

        const fxData: StoredFxData = {
          baseCurrency:
            response.baseCurrency,
          rates: response.rates,
          updatedAt: response.updatedAt,
        };

        saveFxData(fxData);

        set({
          fxBaseCurrency:
            response.baseCurrency,
          fxRates: response.rates,
          fxUpdatedAt: response.updatedAt,
          fxSyncStatus: partialError
            ? "error"
            : "success",
          fxSyncError: partialError,
        });

        return {
          success:
            Object.keys(response.rates)
              .length > 0,
          errors: response.errors,
          error: partialError ?? undefined,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to update exchange rates.";

        set({
          fxSyncStatus: "error",
          fxSyncError: message,
        });

        return {
          success: false,
          errors: {},
          error: message,
        };
      }
    },
  }),
);

export default useCashStore;