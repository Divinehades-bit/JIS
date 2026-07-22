import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const data = [
  { month: "Jan", value: 9200 },
  { month: "Feb", value: 9800 },
  { month: "Mar", value: 10300 },
  { month: "Apr", value: 11050 },
  { month: "May", value: 11800 },
  { month: "Jun", value: 12750 },
  { month: "Jul", value: 14732 },
];

function PortfolioChart() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">

      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Portfolio Growth
        </h2>

        <p className="text-slate-500 text-sm">
          Portfolio value over time
        </p>
      </div>

      <div className="h-80">

        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={data}>

            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="month" />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 5 }}
            />

          </LineChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}

export default PortfolioChart;