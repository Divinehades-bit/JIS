type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-all duration-300">
      <p className="text-sm text-slate-500">{title}</p>

      <h2 className="text-3xl font-bold text-slate-900 mt-3">
        {value}
      </h2>

      {subtitle && (
        <p className="text-sm text-green-600 mt-2 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default StatCard;