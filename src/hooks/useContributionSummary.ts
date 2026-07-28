import { useMemo } from "react";
import useCashStore, {
  type CashMovement,
} from "../store/cashStore";
import useSettingsStore, {
  type CurrencyCode,
} from "../store/settingsStore";

const REVERSAL_NOTE_PREFIX =
  "JIS reversal:";

const isReversalMovement = (
  movement: CashMovement,
) => {
  return (
    movement.type === "adjustment" &&
    Boolean(movement.relatedId) &&
    Boolean(
      movement.note?.startsWith(
        REVERSAL_NOTE_PREFIX,
      ),
    )
  );
};

const getRate = (
  sourceCurrency: CurrencyCode,
  reportingCurrency: CurrencyCode,
  fxBaseCurrency: CurrencyCode | null,
  fxRates: Partial<
    Record<CurrencyCode, number>
  >,
) => {
  if (
    sourceCurrency ===
    reportingCurrency
  ) {
    return 1;
  }

  if (
    fxBaseCurrency !==
    reportingCurrency
  ) {
    return null;
  }

  const rate =
    fxRates[sourceCurrency];

  if (
    rate === undefined ||
    !Number.isFinite(rate) ||
    rate <= 0
  ) {
    return null;
  }

  return rate;
};

const useContributionSummary = () => {
  const movements =
    useCashStore(
      (state) =>
        state.movements,
    );

  const fxBaseCurrency =
    useCashStore(
      (state) =>
        state.fxBaseCurrency,
    );

  const fxRates =
    useCashStore(
      (state) =>
        state.fxRates,
    );

  const reportingCurrency =
    useSettingsStore(
      (state) =>
        state.settings.currency,
    );

  const reversedMovementIds =
    useMemo(() => {
      return new Set(
        movements
          .filter(
            isReversalMovement,
          )
          .map(
            (movement) =>
              movement.relatedId,
          )
          .filter(
            (
              relatedId,
            ): relatedId is string =>
              Boolean(relatedId),
          ),
      );
    }, [movements]);

  return useMemo(() => {
    let deposits = 0;

    let withdrawals = 0;

    let missingFx = false;

    movements.forEach(
      (movement) => {
        if (
          movement.type !==
            "external_deposit" &&
          movement.type !==
            "external_withdrawal"
        ) {
          return;
        }

        /*
         * Corrected deposits or
         * withdrawals must not remain
         * inside current contribution
         * totals.
         */
        if (
          reversedMovementIds.has(
            movement.id,
          )
        ) {
          return;
        }

        const rate =
          getRate(
            movement.currency,
            reportingCurrency,
            fxBaseCurrency,
            fxRates,
          );

        if (rate === null) {
          missingFx = true;

          return;
        }

        const convertedAmount =
          Math.abs(
            movement.amount,
          ) * rate;

        if (
          movement.type ===
          "external_deposit"
        ) {
          deposits +=
            convertedAmount;
        } else {
          withdrawals +=
            convertedAmount;
        }
      },
    );

    return {
      deposits,

      withdrawals,

      netContributions:
        deposits -
        withdrawals,

      reversedCount:
        reversedMovementIds.size,

      missingFx,
    };
  }, [
    movements,
    reversedMovementIds,
    reportingCurrency,
    fxBaseCurrency,
    fxRates,
  ]);
};

export default useContributionSummary;