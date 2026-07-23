import { fetchLatestMarketPrices } from "./marketDataService";
import type { CurrencyCode } from "../store/settingsStore";

export type FxRateResponse = {
  baseCurrency: CurrencyCode;
  rates: Partial<
    Record<CurrencyCode, number>
  >;
  errors: Partial<
    Record<CurrencyCode, string>
  >;
  updatedAt: string;
  source: "Twelve Data";
};

type CurrencyPairConfiguration = {
  symbol: string;
  invertToUsd: boolean;
};

const pairConfigurationByCurrency: Record<
  Exclude<CurrencyCode, "USD">,
  CurrencyPairConfiguration
> = {
  EUR: {
    symbol: "EUR/USD",
    invertToUsd: false,
  },

  PEN: {
    symbol: "USD/PEN",
    invertToUsd: true,
  },

  QAR: {
    symbol: "USD/QAR",
    invertToUsd: true,
  },
};

const getUsdValueForCurrency = (
  currency: CurrencyCode,
  prices: Record<string, number>,
): number | null => {
  if (currency === "USD") {
    return 1;
  }

  const configuration =
    pairConfigurationByCurrency[currency];

  const price =
    prices[configuration.symbol];

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }

  return configuration.invertToUsd
    ? 1 / price
    : price;
};

export const fetchFxRates = async (
  currencies: CurrencyCode[],
  baseCurrency: CurrencyCode,
  signal?: AbortSignal,
): Promise<FxRateResponse> => {
  const uniqueCurrencies = Array.from(
    new Set([
      ...currencies,
      baseCurrency,
      "USD" as CurrencyCode,
    ]),
  );

  const requestedPairs = Array.from(
    new Set(
      uniqueCurrencies
        .filter(
          (
            currency,
          ): currency is Exclude<
            CurrencyCode,
            "USD"
          > => currency !== "USD",
        )
        .map(
          (currency) =>
            pairConfigurationByCurrency[
              currency
            ].symbol,
        ),
    ),
  );

  if (requestedPairs.length === 0) {
    return {
      baseCurrency,
      rates: {
        USD: 1,
      },
      errors: {},
      updatedAt: new Date().toISOString(),
      source: "Twelve Data",
    };
  }

  const marketResponse =
    await fetchLatestMarketPrices(
      requestedPairs,
      signal,
    );

  const usdValueByCurrency =
    uniqueCurrencies.reduce<
      Partial<Record<CurrencyCode, number>>
    >((accumulator, currency) => {
      const usdValue =
        getUsdValueForCurrency(
          currency,
          marketResponse.prices,
        );

      if (usdValue !== null) {
        accumulator[currency] = usdValue;
      }

      return accumulator;
    }, {});

  const baseUsdValue =
    usdValueByCurrency[baseCurrency];

  if (
    baseUsdValue === undefined ||
    !Number.isFinite(baseUsdValue) ||
    baseUsdValue <= 0
  ) {
    throw new Error(
      `Unable to calculate the ${baseCurrency} exchange rate.`,
    );
  }

  const rates: Partial<
    Record<CurrencyCode, number>
  > = {};

  const errors: Partial<
    Record<CurrencyCode, string>
  > = {};

  uniqueCurrencies.forEach((currency) => {
    const currencyUsdValue =
      usdValueByCurrency[currency];

    if (
      currencyUsdValue === undefined ||
      !Number.isFinite(currencyUsdValue) ||
      currencyUsdValue <= 0
    ) {
      errors[currency] =
        `No valid exchange rate was returned for ${currency}.`;

      return;
    }

    rates[currency] =
      currencyUsdValue / baseUsdValue;
  });

  rates[baseCurrency] = 1;

  return {
    baseCurrency,
    rates,
    errors,
    updatedAt: marketResponse.updatedAt,
    source: "Twelve Data",
  };
};