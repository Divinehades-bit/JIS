import { useMemo } from "react";
import useSettingsStore, {
  type CurrencyCode,
} from "../store/settingsStore";

const localeByCurrency: Record<
  CurrencyCode,
  string
> = {
  USD: "en-US",
  PEN: "es-PE",
  EUR: "de-DE",
  QAR: "en-QA",
};

const createCurrencyFormatter = (
  currency: CurrencyCode,
) => {
  return new Intl.NumberFormat(
    localeByCurrency[currency],
    {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
};

const createCompactCurrencyFormatter = (
  currency: CurrencyCode,
) => {
  return new Intl.NumberFormat(
    localeByCurrency[currency],
    {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    },
  );
};

const getCurrencySymbol = (
  currency: CurrencyCode,
) => {
  return (
    createCurrencyFormatter(currency)
      .formatToParts(0)
      .find(
        (part) => part.type === "currency",
      )?.value ?? currency
  );
};

const useCurrencyFormatter = () => {
  const currency = useSettingsStore(
    (state) => state.settings.currency,
  );

  return useMemo(() => {
    const standardFormatter =
      createCurrencyFormatter(currency);

    const compactFormatter =
      createCompactCurrencyFormatter(currency);

    return {
      currency,

      currencySymbol:
        getCurrencySymbol(currency),

      formatCurrency: (value: number) =>
        standardFormatter.format(value),

      formatCompactCurrency: (
        value: number,
      ) => compactFormatter.format(value),

      formatSignedCurrency: (
        value: number,
      ) => {
        const prefix = value > 0 ? "+" : "";

        return `${prefix}${standardFormatter.format(
          value,
        )}`;
      },

      formatCurrencyFor: (
        value: number,
        targetCurrency: CurrencyCode,
      ) => {
        return createCurrencyFormatter(
          targetCurrency,
        ).format(value);
      },

      getCurrencySymbol,
    };
  }, [currency]);
};

export default useCurrencyFormatter;