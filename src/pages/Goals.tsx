import GoalForm from "../components/goals/GoalForm";
import GoalOverview from "../components/goals/GoalOverview";

const Goals = () => {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          Financial planning
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Portfolio goal
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Define your target portfolio value and estimate
          the monthly contribution required to reach it.
        </p>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <GoalForm />

        <GoalOverview />
      </section>
    </div>
  );
};

export default Goals;