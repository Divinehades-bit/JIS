import { Search, Plus, Upload, Download } from "lucide-react";

type Props = {
  onAddPosition: () => void;
};

export default function PortfolioToolbar({
  onAddPosition,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">

        <div className="relative w-full lg:max-w-md">

          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search symbol..."
            className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-blue-500"
          />

        </div>

        <div className="flex flex-wrap gap-3">

          <button
            onClick={onAddPosition}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-white hover:bg-blue-700 transition"
          >
            <Plus size={18} />
            Add Position
          </button>

          <button className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 hover:bg-slate-100 transition">
            <Upload size={18} />
            Import CSV
          </button>

          <button className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 hover:bg-slate-100 transition">
            <Download size={18} />
            Export CSV
          </button>

        </div>

      </div>

    </div>
  );
}