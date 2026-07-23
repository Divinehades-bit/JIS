import { create } from "zustand";

export type PortfolioSnapshotSource =
  | "initial"
  | "market-sync"
  | "portfolio-change"
  | "transaction";

export type PortfolioSnapshot = {
  id: string;
  timestamp: string;
  currentValue: number;
  investedCapital: number;
  gainLoss: number;
  totalReturn: number;
  source: PortfolioSnapshotSource;
};

type SnapshotInput = Omit<PortfolioSnapshot, "id">;

type PortfolioHistoryStore = {
  snapshots: PortfolioSnapshot[];
  recordSnapshot: (snapshot: SnapshotInput) => void;
  clearHistory: () => void;
};

export type PortfolioPositionSnapshotInput = {
  shares: number;
  averageCost: number;
  price: number;
};

const STORAGE_KEY = "jis-portfolio-history";
const MAX_SNAPSHOTS = 2000;

const SNAPSHOT_MERGE_WINDOW_MS =
  5 * 60 * 1000;

const validSources: PortfolioSnapshotSource[] = [
  "initial",
  "market-sync",
  "portfolio-change",
  "transaction",
];

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
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

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
};

const createSnapshotId = () => {
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

const normalizeSnapshot = (
  value: unknown,
): PortfolioSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string" &&
    value.id.trim()
      ? value.id.trim()
      : "";

  const timestamp = normalizeTimestamp(
    value.timestamp,
  );

  const currentValue = normalizeFiniteNumber(
    value.currentValue,
  );

  const investedCapital =
    normalizeFiniteNumber(
      value.investedCapital,
    );

  const gainLoss = normalizeFiniteNumber(
    value.gainLoss,
  );

  const totalReturn = normalizeFiniteNumber(
    value.totalReturn,
  );

  const source =
    typeof value.source === "string" &&
    validSources.includes(
      value.source as PortfolioSnapshotSource,
    )
      ? (value.source as PortfolioSnapshotSource)
      : null;

  if (
    !id ||
    !timestamp ||
    currentValue === null ||
    investedCapital === null ||
    gainLoss === null ||
    totalReturn === null ||
    !source
  ) {
    return null;
  }

  return {
    id,
    timestamp,
    currentValue,
    investedCapital,
    gainLoss,
    totalReturn,
    source,
  };
};

const saveSnapshots = (
  snapshots: PortfolioSnapshot[],
) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(snapshots),
    );
  } catch (error) {
    console.error(
      "Unable to save portfolio history:",
      error,
    );
  }
};

const loadSnapshots = (): PortfolioSnapshot[] => {
  try {
    const storedSnapshots =
      localStorage.getItem(STORAGE_KEY);

    if (!storedSnapshots) {
      return [];
    }

    const parsedSnapshots: unknown =
      JSON.parse(storedSnapshots);

    if (!Array.isArray(parsedSnapshots)) {
      saveSnapshots([]);
      return [];
    }

    const normalizedSnapshots =
      parsedSnapshots
        .map(normalizeSnapshot)
        .filter(
          (
            snapshot,
          ): snapshot is PortfolioSnapshot =>
            snapshot !== null,
        )
        .sort(
          (firstSnapshot, secondSnapshot) =>
            new Date(
              firstSnapshot.timestamp,
            ).getTime() -
            new Date(
              secondSnapshot.timestamp,
            ).getTime(),
        )
        .slice(-MAX_SNAPSHOTS);

    saveSnapshots(normalizedSnapshots);

    return normalizedSnapshots;
  } catch (error) {
    console.error(
      "Unable to load portfolio history:",
      error,
    );

    return [];
  }
};

const metricsAreEqual = (
  firstSnapshot: PortfolioSnapshot,
  secondSnapshot: SnapshotInput,
) => {
  const tolerance = 0.000001;

  return (
    Math.abs(
      firstSnapshot.currentValue -
        secondSnapshot.currentValue,
    ) < tolerance &&
    Math.abs(
      firstSnapshot.investedCapital -
        secondSnapshot.investedCapital,
    ) < tolerance &&
    Math.abs(
      firstSnapshot.gainLoss -
        secondSnapshot.gainLoss,
    ) < tolerance &&
    Math.abs(
      firstSnapshot.totalReturn -
        secondSnapshot.totalReturn,
    ) < tolerance
  );
};

const usePortfolioHistoryStore =
  create<PortfolioHistoryStore>((set) => ({
    snapshots: loadSnapshots(),

    recordSnapshot: (snapshotInput) => {
      const timestamp = normalizeTimestamp(
        snapshotInput.timestamp,
      );

      if (!timestamp) {
        return;
      }

      const normalizedInput: SnapshotInput = {
        ...snapshotInput,
        timestamp,
      };

      set((state) => {
        const latestSnapshot =
          state.snapshots[
            state.snapshots.length - 1
          ] ?? null;

        if (
          latestSnapshot &&
          metricsAreEqual(
            latestSnapshot,
            normalizedInput,
          )
        ) {
          return state;
        }

        const nextSnapshot: PortfolioSnapshot = {
          id: createSnapshotId(),
          ...normalizedInput,
        };

        let nextSnapshots: PortfolioSnapshot[];

        if (latestSnapshot) {
          const latestTimestamp = new Date(
            latestSnapshot.timestamp,
          ).getTime();

          const nextTimestamp = new Date(
            nextSnapshot.timestamp,
          ).getTime();

          const shouldMerge =
            nextTimestamp - latestTimestamp <
            SNAPSHOT_MERGE_WINDOW_MS;

          if (shouldMerge) {
            nextSnapshots = [
              ...state.snapshots.slice(0, -1),
              {
                ...nextSnapshot,
                id: latestSnapshot.id,
              },
            ];
          } else {
            nextSnapshots = [
              ...state.snapshots,
              nextSnapshot,
            ];
          }
        } else {
          nextSnapshots = [nextSnapshot];
        }

        const limitedSnapshots =
          nextSnapshots.slice(-MAX_SNAPSHOTS);

        saveSnapshots(limitedSnapshots);

        return {
          snapshots: limitedSnapshots,
        };
      });
    },

    clearHistory: () => {
      saveSnapshots([]);

      set({
        snapshots: [],
      });
    },
  }));

export const recordPortfolioSnapshot = (
  positions: PortfolioPositionSnapshotInput[],
  source: PortfolioSnapshotSource,
  timestamp = new Date().toISOString(),
) => {
  const investedCapital = positions.reduce(
    (total, position) =>
      total +
      position.shares * position.averageCost,
    0,
  );

  const currentValue = positions.reduce(
    (total, position) =>
      total + position.shares * position.price,
    0,
  );

  const gainLoss =
    currentValue - investedCapital;

  const totalReturn =
    investedCapital > 0
      ? (gainLoss / investedCapital) * 100
      : 0;

  usePortfolioHistoryStore
    .getState()
    .recordSnapshot({
      timestamp,
      currentValue,
      investedCapital,
      gainLoss,
      totalReturn,
      source,
    });
};

export const ensureInitialPortfolioSnapshot = (
  positions: PortfolioPositionSnapshotInput[],
) => {
  if (positions.length === 0) {
    return;
  }

  const existingSnapshots =
    usePortfolioHistoryStore.getState()
      .snapshots;

  if (existingSnapshots.length > 0) {
    return;
  }

  recordPortfolioSnapshot(
    positions,
    "initial",
  );
};

export default usePortfolioHistoryStore;