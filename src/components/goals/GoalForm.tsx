import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import useCurrencyFormatter from "../../hooks/useCurrencyFormatter";
import useGoalStore from "../../store/goalStore";

const GoalForm = () => {
  const goal = useGoalStore(
    (state) => state.goal,
  );

  const saveGoal = useGoalStore(
    (state) => state.saveGoal,
  );

  const clearGoal = useGoalStore(
    (state) => state.clearGoal,
  );

  const { currencySymbol } =
    useCurrencyFormatter();

  const [
    targetAmount,
    setTargetAmount,
  ] = useState("");

  const [
    targetDate,
    setTargetDate,
  ] = useState("");

  const [
    monthlyContribution,
    setMonthlyContribution,
  ] = useState("");

  const [
    annualReturn,
    setAnnualReturn,
  ] = useState("8");

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    if (!goal) {
      setTargetAmount("");
      setTargetDate("");
      setMonthlyContribution("");
      setAnnualReturn("8");

      return;
    }

    setTargetAmount(
      String(goal.targetAmount),
    );

    setTargetDate(
      goal.targetDate,
    );

    setMonthlyContribution(
      String(
        goal.monthlyContribution,
      ),
    );

    setAnnualReturn(
      String(goal.annualReturn),
    );
  }, [goal]);

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    clearMessages();

    const parsedTargetAmount =
      Number(targetAmount);

    const parsedContribution =
      Number(monthlyContribution);

    const parsedAnnualReturn =
      Number(annualReturn);

    const parsedTargetDate =
      new Date(
        `${targetDate}T23:59:59`,
      );

    const today = new Date();

    if (
      !Number.isFinite(
        parsedTargetAmount,
      ) ||
      parsedTargetAmount <= 0
    ) {
      setError(
        "Target net worth must be greater than zero.",
      );

      return;
    }

    if (
      !targetDate ||
      Number.isNaN(
        parsedTargetDate.getTime(),
      )
    ) {
      setError(
        "Enter a valid target date.",
      );

      return;
    }

    if (
      parsedTargetDate <= today
    ) {
      setError(
        "Target date must be later than today.",
      );

      return;
    }

    if (
      !Number.isFinite(
        parsedContribution,
      ) ||
      parsedContribution < 0
    ) {
      setError(
        "Monthly contribution cannot be negative.",
      );

      return;
    }

    if (
      !Number.isFinite(
        parsedAnnualReturn,
      ) ||
      parsedAnnualReturn < 0 ||
      parsedAnnualReturn > 100
    ) {
      setError(
        "Expected annual return must be between 0% and 100%.",
      );

      return;
    }

    saveGoal({
      targetAmount:
        parsedTargetAmount,

      targetDate,

      monthlyContribution:
        parsedContribution,

      annualReturn:
        parsedAnnualReturn,
    });

    setSuccessMessage(
      goal
        ? "Financial goal updated successfully."
        : "Financial goal created successfully.",
    );
  };

  const handleClearGoal = () => {
    const confirmed =
      window.confirm(
        "Delete this financial goal?",
      );

    if (!confirmed) {
      return;
    }

    clearGoal();

    clearMessages();
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

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Define your target net
          worth, monthly contribution
          and expected investment
          return.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-5"
      >
        <div>
          <label
            htmlFor="goal-target"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Target net worth
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {currencySymbol}
            </span>

            <input
              id="goal-target"
              type="number"
              value={targetAmount}
              onChange={(event) => {
                setTargetAmount(
                  event.target.value,
                );

                clearMessages();
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
            htmlFor="goal-date"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Target date
          </label>

          <input
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(event) => {
              setTargetDate(
                event.target.value,
              );

              clearMessages();
            }}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div>
          <label
            htmlFor="goal-contribution"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Planned monthly contribution
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {currencySymbol}
            </span>

            <input
              id="goal-contribution"
              type="number"
              value={
                monthlyContribution
              }
              onChange={(event) => {
                setMonthlyContribution(
                  event.target.value,
                );

                clearMessages();
              }}
              placeholder="1500"
              min="0"
              step="any"
              className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="goal-return"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Base investment return
          </label>

          <div className="relative">
            <input
              id="goal-return"
              type="number"
              value={annualReturn}
              onChange={(event) => {
                setAnnualReturn(
                  event.target.value,
                );

                clearMessages();
              }}
              placeholder="8"
              min="0"
              max="100"
              step="0.1"
              className="w-full rounded-xl border border-slate-200 py-3 pl-4 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              %
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            JIS will also calculate a
            conservative scenario 2
            percentage points lower and
            an optimistic scenario 2
            points higher.
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
              onClick={
                handleClearGoal
              }
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