import { useMemo } from "react";
import useSettingsStore, {
  type CurrencyCode,
} from "../store/settingsStore";

const localeByCurrency: Record<CurrencyCode, string> = {
  USD: "en-US",
  PEN: "es-PE",
  EUR: "de-DE",
};

const useCurrencyFormatter = () => {
  const currency = useSettingsStore(
    (state) => state.settings.currency,
  );

  return useMemo(() => {
    const locale = localeByCurrency[currency];

    const standardFormatter = new Intl.NumberFormat(
      locale,
      {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );

    const compactFormatter = new Intl.NumberFormat(
      locale,
      {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
      },
    );

    const currencySymbol =
      standardFormatter
        .formatToParts(0)
        .find((part) => part.type === "currency")
        ?.value ?? currency;

    return {
      currency,
      currencySymbol,

      formatCurrency: (value: number) =>
        standardFormatter.format(value),

      formatCompactCurrency: (value: number) =>
        compactFormatter.format(value),

      formatSignedCurrency: (value: number) => {
        const prefix = value > 0 ? "+" : "";

        return `${prefix}${standardFormatter.format(value)}`;
      },
    };
  }, [currency]);
};

export default useCurrencyFormatter;