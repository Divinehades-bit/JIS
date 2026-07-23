import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useGoalStore from "../../store/goalStore";

const getTodayInputValue = () => {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
      now.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 10);
};

const GoalForm = () => {
  const goal = useGoalStore((state) => state.goal);

  const saveGoal = useGoalStore(
    (state) => state.saveGoal,
  );

  const clearGoal = useGoalStore(
    (state) => state.clearGoal,
  );

  const { currencySymbol } =
    useCurrencyFormatter();

  const [targetAmount, setTargetAmount] =
    useState("");

  const [targetDate, setTargetDate] =
    useState("");

  const [
    monthlyContribution,
    setMonthlyContribution,
  ] = useState("");

  const [annualReturn, setAnnualReturn] =
    useState("0");

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    if (!goal) {
      setTargetAmount("");
      setTargetDate("");
      setMonthlyContribution("");
      setAnnualReturn("0");
      return;
    }

    setTargetAmount(String(goal.targetAmount));
    setTargetDate(goal.targetDate);

    setMonthlyContribution(
      String(goal.monthlyContribution),
    );

    setAnnualReturn(String(goal.annualReturn));
  }, [goal]);

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    const parsedTargetAmount = Number(
      targetAmount,
    );

    const parsedMonthlyContribution = Number(
      monthlyContribution,
    );

    const parsedAnnualReturn = Number(
      annualReturn,
    );

    const parsedTargetDate = new Date(
      `${targetDate}T23:59:59`,
    );

    const today = new Date();

    if (
      !Number.isFinite(parsedTargetAmount) ||
      parsedTargetAmount <= 0
    ) {
      setError(
        "Target amount must be greater than zero.",
      );

      return;
    }

    if (
      !targetDate ||
      Number.isNaN(parsedTargetDate.getTime())
    ) {
      setError("Enter a valid target date.");
      return;
    }

    if (parsedTargetDate <= today) {
      setError(
        "Target date must be later than today.",
      );

      return;
    }

    if (
      !Number.isFinite(
        parsedMonthlyContribution,
      ) ||
      parsedMonthlyContribution < 0
    ) {
      setError(
        "Monthly contribution cannot be negative.",
      );

      return;
    }

    if (
      !Number.isFinite(parsedAnnualReturn) ||
      parsedAnnualReturn < 0 ||
      parsedAnnualReturn > 100
    ) {
      setError(
        "Expected annual return must be between 0% and 100%.",
      );

      return;
    }

    saveGoal({
      targetAmount: parsedTargetAmount,
      targetDate,
      monthlyContribution:
        parsedMonthlyContribution,
      annualReturn: parsedAnnualReturn,
    });

    setSuccessMessage(
      goal
        ? "Financial goal updated successfully."
        : "Financial goal created successfully.",
    );
  };

  const handleClearGoal = () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this financial goal?",
    );

    if (!confirmed) {
      return;
    }

    clearGoal();
    setError("");
    setSuccessMessage("");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">
          Goal settings
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          {goal
            ? "Update your goal"
            : "Create your goal"}
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Define your target, monthly contribution and
          expected annual return.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        <div>
          <label
            htmlFor="goal-target-amount"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Target portfolio value
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {currencySymbol}
            </span>

            <input
              id="goal-target-amount"
              type="number"
              value={targetAmount}
              onChange={(event) => {
                setTargetAmount(event.target.value);
                setError("");
                setSuccessMessage("");
              }}
              placeholder="1000000"
              min="0"
              step="any"
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="goal-target-date"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Target date
          </label>

          <input
            id="goal-target-date"
            type="date"
            value={targetDate}
            min={getTodayInputValue()}
            onChange={(event) => {
              setTargetDate(event.target.value);
              setError("");
              setSuccessMessage("");
            }}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="goal-monthly-contribution"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Planned monthly contribution
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {currencySymbol}
            </span>

            <input
              id="goal-monthly-contribution"
              type="number"
              value={monthlyContribution}
              onChange={(event) => {
                setMonthlyContribution(
                  event.target.value,
                );

                setError("");
                setSuccessMessage("");
              }}
              placeholder="1000"
              min="0"
              step="any"
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="goal-annual-return"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Expected annual return
          </label>

          <div className="relative">
            <input
              id="goal-annual-return"
              type="number"
              value={annualReturn}
              onChange={(event) => {
                setAnnualReturn(event.target.value);
                setError("");
                setSuccessMessage("");
              }}
              placeholder="8"
              min="0"
              max="100"
              step="any"
              className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-9 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              %
            </span>
          </div>

          <p className="mt-1.5 text-xs text-slate-400">
            This is a projection assumption, not a
            guaranteed return.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {successMessage}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          {goal && (
            <button
              type="button"
              onClick={handleClearGoal}
              className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Delete goal
            </button>
          )}

          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {goal
              ? "Save changes"
              : "Create goal"}
          </button>
        </div>
      </form>
    </section>
  );
};

export default GoalForm;