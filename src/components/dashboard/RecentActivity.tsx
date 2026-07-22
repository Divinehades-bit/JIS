function RecentActivity() {

  const activities = [
    "Bought VOO",
    "Dividend received",
    "Bought IXN",
    "Portfolio rebalanced",
    "Cash deposited",
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

      <h2 className="text-xl font-bold">
        Recent Activity
      </h2>

      <p className="text-slate-500 text-sm mb-6">
        Latest portfolio events
      </p>

      <div className="space-y-4">

        {activities.map((activity, index) => (

          <div
            key={index}
            className="flex items-center justify-between border-b border-slate-100 pb-3"
          >

            <span>{activity}</span>

            <span className="text-green-600 font-semibold">
              ✓
            </span>

          </div>

        ))}

      </div>

    </div>
  );
}

export default RecentActivity;