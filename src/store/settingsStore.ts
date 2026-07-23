import { create } from "zustand";

export const supportedCurrencies = [
  "USD",
  "PEN",
  "EUR",
  "QAR",
] as const;

export type CurrencyCode =
  (typeof supportedCurrencies)[number];

export type AppSettings = {
  portfolioName: string;
  currency: CurrencyCode;
  updatedAt: string;
};

export type SettingsInput = {
  portfolioName: string;
  currency: CurrencyCode;
};

type SettingsStore = {
  settings: AppSettings;
  updateSettings: (input: SettingsInput) => void;
  resetSettings: () => void;
};

export const SETTINGS_STORAGE_KEY = "jis-settings";

export const DEFAULT_SETTINGS: AppSettings = {
  portfolioName: "My Portfolio",
  currency: "USD",
  updatedAt: new Date().toISOString(),
};

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const isSupportedCurrency = (
  value: unknown,
): value is CurrencyCode => {
  return (
    typeof value === "string" &&
    supportedCurrencies.includes(
      value as CurrencyCode,
    )
  );
};

export const normalizeAppSettings = (
  value: unknown,
): AppSettings | null => {
  if (!isRecord(value)) {
    return null;
  }

  const portfolioName =
    typeof value.portfolioName === "string"
      ? value.portfolioName.trim()
      : "";

  const currency = isSupportedCurrency(
    value.currency,
  )
    ? value.currency
    : null;

  const updatedAt =
    typeof value.updatedAt === "string" &&
    !Number.isNaN(
      new Date(value.updatedAt).getTime(),
    )
      ? value.updatedAt
      : new Date().toISOString();

  if (!portfolioName || !currency) {
    return null;
  }

  return {
    portfolioName,
    currency,
    updatedAt,
  };
};

const saveSettingsToStorage = (
  settings: AppSettings,
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch (error) {
    console.error(
      "Unable to save JIS settings:",
      error,
    );
  }
};

const loadSettings = (): AppSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const savedSettings = localStorage.getItem(
      SETTINGS_STORAGE_KEY,
    );

    if (!savedSettings) {
      saveSettingsToStorage(DEFAULT_SETTINGS);

      return DEFAULT_SETTINGS;
    }

    const parsedSettings: unknown =
      JSON.parse(savedSettings);

    const normalizedSettings =
      normalizeAppSettings(parsedSettings);

    if (!normalizedSettings) {
      saveSettingsToStorage(DEFAULT_SETTINGS);

      return DEFAULT_SETTINGS;
    }

    saveSettingsToStorage(normalizedSettings);

    return normalizedSettings;
  } catch (error) {
    console.error(
      "Unable to load JIS settings:",
      error,
    );

    return DEFAULT_SETTINGS;
  }
};

const useSettingsStore = create<SettingsStore>(
  (set) => ({
    settings: loadSettings(),

    updateSettings: (input) => {
      const portfolioName =
        input.portfolioName.trim();

      if (
        !portfolioName ||
        portfolioName.length > 40 ||
        !isSupportedCurrency(input.currency)
      ) {
        console.error(
          "Invalid JIS settings:",
          input,
        );

        return;
      }

      const nextSettings: AppSettings = {
        portfolioName,
        currency: input.currency,
        updatedAt: new Date().toISOString(),
      };

      saveSettingsToStorage(nextSettings);

      set({
        settings: nextSettings,
      });
    },

    resetSettings: () => {
      const nextSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        updatedAt: new Date().toISOString(),
      };

      saveSettingsToStorage(nextSettings);

      set({
        settings: nextSettings,
      });
    },
  }),
);

export default useSettingsStore;