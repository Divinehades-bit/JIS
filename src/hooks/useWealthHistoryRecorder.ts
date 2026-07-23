import { useEffect } from "react";
import useWealthSummary from "./useWealthSummary";
import useWealthHistoryStore from "../store/wealthHistoryStore";

const useWealthHistoryRecorder =
  () => {
    const summary =
      useWealthSummary();

    const recordSnapshot =
      useWealthHistoryStore(
        (state) =>
          state.recordSnapshot,
      );

    useEffect(() => {
      if (
        summary.netWorth === null ||
        summary.investmentCurrentValue ===
          null ||
        summary.investmentCost ===
          null ||
        summary.investmentGainLoss ===
          null
      ) {
        return;
      }

      recordSnapshot({
        timestamp:
          new Date().toISOString(),

        reportingCurrency:
          summary.baseCurrency,

        netWorth:
          summary.netWorth,

        investmentValue:
          summary.investmentCurrentValue,

        investmentCost:
          summary.investmentCost,

        investmentGainLoss:
          summary.investmentGainLoss,

        investmentReturn:
          summary.investmentReturn,

        cashValue:
          summary.totalCash,

        cashAnnualIncome:
          summary.annualCashIncome,

        cashYield:
          summary.cashWeightedYield,

        source: "snapshot",
      });
    }, [
      recordSnapshot,

      summary.baseCurrency,

      summary.netWorth,

      summary.investmentCurrentValue,

      summary.investmentCost,

      summary.investmentGainLoss,

      summary.investmentReturn,

      summary.totalCash,

      summary.annualCashIncome,

      summary.cashWeightedYield,
    ]);
  };

export default useWealthHistoryRecorder;