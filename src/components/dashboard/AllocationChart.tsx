import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

const data = [
  { name: "US Stocks", value: 55 },
  { name: "International", value: 20 },
  { name: "Bonds", value: 15 },
  { name: "Cash", value: 10 },
];

const COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#94a3b8",
];

function AllocationChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full">

      <h2 className="text-xl font-bold text-slate-800">
        Asset Allocation
      </h2>

      <p className="text-slate-500 text-sm mb-6">
        Portfolio distribution
      </p>

      <div className="h-72">

        <ResponsiveContainer width="100%" height="100%">

          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={3}
            >

              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[index]}
                />
              ))}

            </Pie>

            <Tooltip />

          </PieChart>

        </ResponsiveContainer>

      </div>

      <div className="space-y-2 mt-4">

        {data.map((item, index) => (

          <div
            key={item.name}
            className="flex justify-between items-center text-sm"
          >

            <div className="flex items-center gap-2">

              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: COLORS[index],
                }}
              />

              {item.name}

            </div>

            <strong>{item.value}%</strong>

          </div>

        ))}

      </div>

    </div>
  );
}

export default AllocationChart;