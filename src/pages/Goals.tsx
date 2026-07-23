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
          Net worth goal
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Set a wealth target using
          your complete JIS net worth:
          investments plus cash.
          Compare conservative, base
          and optimistic return
          scenarios and calculate the
          monthly investment required.
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