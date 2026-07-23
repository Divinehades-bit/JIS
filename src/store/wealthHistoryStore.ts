import { create } from "zustand";
import {
  isSupportedCurrency,
  type CurrencyCode,
} from "./settingsStore";

export type WealthSnapshotSource =
  | "snapshot"
  | "legacy";

export type WealthSnapshot = {
  id: string;
  timestamp: string;
  reportingCurrency: CurrencyCode;

  netWorth: number;

  investmentValue: number;
  investmentCost: number;
  investmentGainLoss: number;
  investmentReturn: number;

  cashValue: number;
  cashAnnualIncome: number;
  cashYield: number;

  source: WealthSnapshotSource;
};

type WealthSnapshotInput = Omit<
  WealthSnapshot,
  "id"
>;

type WealthHistoryStore = {
  snapshots: WealthSnapshot[];

  recordSnapshot: (
    snapshot: WealthSnapshotInput,
  ) => void;

  clearHistory: () => void;
};

const STORAGE_KEY =
  "jis-wealth-history";

const LEGACY_STORAGE_KEY =
  "jis-portfolio-history";

const MAX_SNAPSHOTS = 3000;

const MERGE_WINDOW_MS =
  5 * 60 * 1000;

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return (
    typeof value === "object" &&
    value !== null
  );
};

const normalizeFiniteNumber = (
  value: unknown,
): number | null => {
  const parsedValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : null;
};

const normalizeTimestamp = (
  value: unknown,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const parsedDate =
    new Date(value);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return null;
  }

  return parsedDate.toISOString();
};

const createSnapshotId = () => {
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

const normalizeSnapshot = (
  value: unknown,
): WealthSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string" &&
    value.id.trim()
      ? value.id.trim()
      : "";

  const timestamp =
    normalizeTimestamp(
      value.timestamp,
    );

  const reportingCurrency =
    isSupportedCurrency(
      value.reportingCurrency,
    )
      ? value.reportingCurrency
      : null;

  const netWorth =
    normalizeFiniteNumber(
      value.netWorth,
    );

  const investmentValue =
    normalizeFiniteNumber(
      value.investmentValue,
    );

  const investmentCost =
    normalizeFiniteNumber(
      value.investmentCost,
    );

  const investmentGainLoss =
    normalizeFiniteNumber(
      value.investmentGainLoss,
    );

  const investmentReturn =
    normalizeFiniteNumber(
      value.investmentReturn,
    );

  const cashValue =
    normalizeFiniteNumber(
      value.cashValue,
    );

  const cashAnnualIncome =
    normalizeFiniteNumber(
      value.cashAnnualIncome,
    );

  const cashYield =
    normalizeFiniteNumber(
      value.cashYield,
    );

  const source: WealthSnapshotSource =
    value.source === "legacy"
      ? "legacy"
      : "snapshot";

  if (
    !id ||
    !timestamp ||
    !reportingCurrency ||
    netWorth === null ||
    investmentValue === null ||
    investmentCost === null ||
    investmentGainLoss === null ||
    investmentReturn === null ||
    cashValue === null ||
    cashAnnualIncome === null ||
    cashYield === null
  ) {
    return null;
  }

  return {
    id,
    timestamp,
    reportingCurrency,

    netWorth,

    investmentValue,
    investmentCost,
    investmentGainLoss,
    investmentReturn,

    cashValue,
    cashAnnualIncome,
    cashYield,

    source,
  };
};

const saveSnapshots = (
  snapshots: WealthSnapshot[],
) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(snapshots),
    );
  } catch (error) {
    console.error(
      "Unable to save wealth history:",
      error,
    );
  }
};

const migrateLegacySnapshots =
  (): WealthSnapshot[] => {
    try {
      const storedLegacy =
        localStorage.getItem(
          LEGACY_STORAGE_KEY,
        );

      if (!storedLegacy) {
        return [];
      }

      const parsedLegacy: unknown =
        JSON.parse(storedLegacy);

      if (
        !Array.isArray(parsedLegacy)
      ) {
        return [];
      }

      return parsedLegacy
        .map((value) => {
          if (!isRecord(value)) {
            return null;
          }

          const timestamp =
            normalizeTimestamp(
              value.timestamp,
            );

          const currentValue =
            normalizeFiniteNumber(
              value.currentValue,
            );

          const investedCapital =
            normalizeFiniteNumber(
              value.investedCapital,
            );

          const gainLoss =
            normalizeFiniteNumber(
              value.gainLoss,
            );

          const totalReturn =
            normalizeFiniteNumber(
              value.totalReturn,
            );

          if (
            !timestamp ||
            currentValue === null ||
            investedCapital === null ||
            gainLoss === null ||
            totalReturn === null
          ) {
            return null;
          }

          const snapshot:
            WealthSnapshot = {
            id: createSnapshotId(),

            timestamp,

            reportingCurrency:
              "USD",

            netWorth:
              currentValue,

            investmentValue:
              currentValue,

            investmentCost:
              investedCapital,

            investmentGainLoss:
              gainLoss,

            investmentReturn:
              totalReturn,

            cashValue: 0,

            cashAnnualIncome: 0,

            cashYield: 0,

            source: "legacy",
          };

          return snapshot;
        })
        .filter(
          (
            snapshot,
          ): snapshot is WealthSnapshot =>
            snapshot !== null,
        )
        .sort(
          (
            firstSnapshot,
            secondSnapshot,
          ) =>
            new Date(
              firstSnapshot.timestamp,
            ).getTime() -
            new Date(
              secondSnapshot.timestamp,
            ).getTime(),
        );
    } catch (error) {
      console.error(
        "Unable to migrate portfolio history:",
        error,
      );

      return [];
    }
  };

const loadSnapshots =
  (): WealthSnapshot[] => {
    try {
      const storedSnapshots =
        localStorage.getItem(
          STORAGE_KEY,
        );

      if (!storedSnapshots) {
        const migratedSnapshots =
          migrateLegacySnapshots();

        saveSnapshots(
          migratedSnapshots,
        );

        return migratedSnapshots;
      }

      const parsedSnapshots: unknown =
        JSON.parse(
          storedSnapshots,
        );

      if (
        !Array.isArray(
          parsedSnapshots,
        )
      ) {
        return [];
      }

      const normalizedSnapshots =
        parsedSnapshots
          .map(normalizeSnapshot)
          .filter(
            (
              snapshot,
            ): snapshot is WealthSnapshot =>
              snapshot !== null,
          )
          .sort(
            (
              firstSnapshot,
              secondSnapshot,
            ) =>
              new Date(
                firstSnapshot.timestamp,
              ).getTime() -
              new Date(
                secondSnapshot.timestamp,
              ).getTime(),
          )
          .slice(-MAX_SNAPSHOTS);

      saveSnapshots(
        normalizedSnapshots,
      );

      return normalizedSnapshots;
    } catch (error) {
      console.error(
        "Unable to load wealth history:",
        error,
      );

      return [];
    }
  };

const metricsAreEqual = (
  first: WealthSnapshot,
  second: WealthSnapshotInput,
) => {
  const tolerance = 0.000001;

  return (
    first.reportingCurrency ===
      second.reportingCurrency &&
    Math.abs(
      first.netWorth -
        second.netWorth,
    ) < tolerance &&
    Math.abs(
      first.investmentValue -
        second.investmentValue,
    ) < tolerance &&
    Math.abs(
      first.investmentCost -
        second.investmentCost,
    ) < tolerance &&
    Math.abs(
      first.cashValue -
        second.cashValue,
    ) < tolerance &&
    Math.abs(
      first.cashAnnualIncome -
        second.cashAnnualIncome,
    ) < tolerance &&
    Math.abs(
      first.cashYield -
        second.cashYield,
    ) < tolerance
  );
};

const useWealthHistoryStore =
  create<WealthHistoryStore>(
    (set) => ({
      snapshots: loadSnapshots(),

      recordSnapshot: (
        snapshotInput,
      ) => {
        const timestamp =
          normalizeTimestamp(
            snapshotInput.timestamp,
          );

        if (!timestamp) {
          return;
        }

        const nextInput:
          WealthSnapshotInput = {
          ...snapshotInput,
          timestamp,
        };

        set((state) => {
          const latestSnapshot =
            state.snapshots[
              state.snapshots.length -
                1
            ] ?? null;

          if (
            latestSnapshot &&
            metricsAreEqual(
              latestSnapshot,
              nextInput,
            )
          ) {
            return state;
          }

          const nextSnapshot:
            WealthSnapshot = {
            id: createSnapshotId(),
            ...nextInput,
          };

          let nextSnapshots:
            WealthSnapshot[];

          if (latestSnapshot) {
            const latestTime =
              new Date(
                latestSnapshot.timestamp,
              ).getTime();

            const nextTime =
              new Date(
                nextSnapshot.timestamp,
              ).getTime();

            const shouldMerge =
              nextTime >= latestTime &&
              nextTime -
                latestTime <
                MERGE_WINDOW_MS;

            if (shouldMerge) {
              nextSnapshots = [
                ...state.snapshots.slice(
                  0,
                  -1,
                ),

                {
                  ...nextSnapshot,

                  id:
                    latestSnapshot.id,
                },
              ];
            } else {
              nextSnapshots = [
                ...state.snapshots,
                nextSnapshot,
              ];
            }
          } else {
            nextSnapshots = [
              nextSnapshot,
            ];
          }

          const limitedSnapshots =
            nextSnapshots.slice(
              -MAX_SNAPSHOTS,
            );

          saveSnapshots(
            limitedSnapshots,
          );

          return {
            snapshots:
              limitedSnapshots,
          };
        });
      },

      clearHistory: () => {
        saveSnapshots([]);

        set({
          snapshots: [],
        });
      },
    }),
  );

export default useWealthHistoryStore;