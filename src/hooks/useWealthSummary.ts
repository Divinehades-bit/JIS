import { useMemo } from "react";
import useCashStore from "../store/cashStore";
import usePortfolioStore from "../store/portfolioStore";
import useSettingsStore, {
  type CurrencyCode,
} from "../store/settingsStore";

const getValidRate = (
  currency: CurrencyCode,
  baseCurrency: CurrencyCode,
  fxBaseCurrency: CurrencyCode | null,
  fxRates: Partial<Record<CurrencyCode, number>>,
): number | null => {
  if (currency === baseCurrency) {
    return 1;
  }

  if (fxBaseCurrency !== baseCurrency) {
    return null;
  }

  const rate = fxRates[currency];

  if (
    rate === undefined ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return null;
  }

  return rate;
};

const useWealthSummary = () => {
  const positions = usePortfolioStore(
    (state) => state.positions,
  );

  const accounts = useCashStore(
    (state) => state.accounts,
  );

  const fxBaseCurrency = useCashStore(
    (state) => state.fxBaseCurrency,
  );

  const fxRates = useCashStore(
    (state) => state.fxRates,
  );

  const baseCurrency = useSettingsStore(
    (state) => state.settings.currency,
  );

  return useMemo(() => {
    /*
     * Securities currently tracked by JIS
     * are treated as USD-denominated.
     */
    const investmentCurrentValueUsd =
      positions.reduce(
        (total, position) =>
          total +
          position.shares * position.price,
        0,
      );

    const investmentCostUsd =
      positions.reduce(
        (total, position) =>
          total +
          position.shares *
            position.averageCost,
        0,
      );

    const investmentGainLossUsd =
      investmentCurrentValueUsd -
      investmentCostUsd;

    const investmentReturn =
      investmentCostUsd > 0
        ? (investmentGainLossUsd /
            investmentCostUsd) *
          100
        : 0;

    const usdToBaseRate = getValidRate(
      "USD",
      baseCurrency,
      fxBaseCurrency,
      fxRates,
    );

    const investmentCurrentValue =
      usdToBaseRate === null
        ? null
        : investmentCurrentValueUsd *
          usdToBaseRate;

    const investmentCost =
      usdToBaseRate === null
        ? null
        : investmentCostUsd *
          usdToBaseRate;

    const investmentGainLoss =
      usdToBaseRate === null
        ? null
        : investmentGainLossUsd *
          usdToBaseRate;

    let totalCash = 0;
    let annualCashIncome = 0;
    let missingFxAccountCount = 0;

    const cashByCurrency = new Map<
      CurrencyCode,
      number
    >();

    accounts.forEach((account) => {
      const rate = getValidRate(
        account.currency,
        baseCurrency,
        fxBaseCurrency,
        fxRates,
      );

      if (rate === null) {
        missingFxAccountCount += 1;
        return;
      }

      const convertedBalance =
        account.balance * rate;

      const annualIncome =
        convertedBalance *
        (account.annualYield / 100);

      totalCash += convertedBalance;
      annualCashIncome += annualIncome;

      cashByCurrency.set(
        account.currency,
        (cashByCurrency.get(
          account.currency,
        ) ?? 0) + convertedBalance,
      );
    });

    const cashWeightedYield =
      totalCash > 0
        ? (annualCashIncome /
            totalCash) *
          100
        : 0;

    const monthlyCashIncome =
      annualCashIncome / 12;

    const investmentFxMissing =
      investmentCurrentValueUsd > 0 &&
      investmentCurrentValue === null;

    const hasCompleteFx =
      !investmentFxMissing &&
      missingFxAccountCount === 0;

    const netWorth =
      investmentCurrentValue === null
        ? null
        : investmentCurrentValue +
          totalCash;

    const cashAllocation =
      netWorth !== null && netWorth > 0
        ? (totalCash / netWorth) * 100
        : 0;

    const investmentAllocation =
      investmentCurrentValue !== null &&
      netWorth !== null &&
      netWorth > 0
        ? (investmentCurrentValue /
            netWorth) *
          100
        : 0;

    const currencyBreakdown = Array.from(
      cashByCurrency.entries(),
    )
      .map(([currency, value]) => ({
        currency,
        value,

        percentage:
          totalCash > 0
            ? (value / totalCash) * 100
            : 0,
      }))
      .sort(
        (firstItem, secondItem) =>
          secondItem.value -
          firstItem.value,
      );

    return {
      baseCurrency,

      investmentCurrentValueUsd,
      investmentCostUsd,
      investmentGainLossUsd,

      investmentCurrentValue,
      investmentCost,
      investmentGainLoss,
      investmentReturn,

      totalCash,
      annualCashIncome,
      monthlyCashIncome,
      cashWeightedYield,

      netWorth,
      cashAllocation,
      investmentAllocation,

      investmentFxMissing,
      missingFxAccountCount,
      hasCompleteFx,

      positionCount: positions.length,
      cashAccountCount: accounts.length,

      currencyBreakdown,
    };
  }, [
    accounts,
    baseCurrency,
    fxBaseCurrency,
    fxRates,
    positions,
  ]);
};

export default useWealthSummary;