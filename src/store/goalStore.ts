import { create } from "zustand";

export type FinancialGoal = {
  id: string;
  targetAmount: number;
  targetDate: string;
  monthlyContribution: number;
  annualReturn: number;
  updatedAt: string;
};

export type FinancialGoalInput = {
  targetAmount: number;
  targetDate: string;
  monthlyContribution: number;
  annualReturn: number;
};

type GoalStore = {
  goal: FinancialGoal | null;
  saveGoal: (goal: FinancialGoalInput) => void;
  clearGoal: () => void;
};

const STORAGE_KEY = "jis-financial-goal";

const isRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const normalizePositiveNumber = (
  value: unknown,
): number | null => {
  const parsedValue =
    typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
};

const normalizeNonNegativeNumber = (
  value: unknown,
): number | null => {
  const parsedValue =
    typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
};

const createGoalId = () => {
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

const normalizeGoal = (
  value: unknown,
): FinancialGoal | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id =
    typeof value.id === "string" && value.id.trim()
      ? value.id
      : createGoalId();

  const targetAmount = normalizePositiveNumber(
    value.targetAmount,
  );

  const monthlyContribution =
    normalizeNonNegativeNumber(
      value.monthlyContribution,
    );

  const annualReturn = normalizeNonNegativeNumber(
    value.annualReturn,
  );

  const targetDate =
    typeof value.targetDate === "string"
      ? value.targetDate
      : "";

  const parsedTargetDate = new Date(
    `${targetDate}T12:00:00`,
  );

  const updatedAt =
    typeof value.updatedAt === "string"
      ? value.updatedAt
      : new Date().toISOString();

  if (
    targetAmount === null ||
    monthlyContribution === null ||
    annualReturn === null ||
    !targetDate ||
    Number.isNaN(parsedTargetDate.getTime())
  ) {
    return null;
  }

  return {
    id,
    targetAmount,
    targetDate,
    monthlyContribution,
    annualReturn,
    updatedAt,
  };
};

const saveGoalToStorage = (
  goal: FinancialGoal | null,
) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (goal === null) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(goal),
    );
  } catch (error) {
    console.error(
      "Unable to save financial goal:",
      error,
    );
  }
};

const loadGoal = (): FinancialGoal | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedGoal =
      localStorage.getItem(STORAGE_KEY);

    if (!savedGoal) {
      return null;
    }

    const parsedGoal: unknown = JSON.parse(savedGoal);

    const normalizedGoal = normalizeGoal(parsedGoal);

    if (!normalizedGoal) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    saveGoalToStorage(normalizedGoal);

    return normalizedGoal;
  } catch (error) {
    console.error(
      "Unable to load financial goal:",
      error,
    );

    return null;
  }
};

const useGoalStore = create<GoalStore>((set) => ({
  goal: loadGoal(),

  saveGoal: (goalInput) => {
    set((state) => {
      const normalizedGoal = normalizeGoal({
        id: state.goal?.id ?? createGoalId(),
        ...goalInput,
        updatedAt: new Date().toISOString(),
      });

      if (!normalizedGoal) {
        console.error(
          "Invalid financial goal:",
          goalInput,
        );

        return state;
      }

      saveGoalToStorage(normalizedGoal);

      return {
        goal: normalizedGoal,
      };
    });
  },

  clearGoal: () => {
    saveGoalToStorage(null);

    set({
      goal: null,
    });
  },
}));

export default useGoalStore;