import { Bell, Search } from "lucide-react";

function TopBar() {
  return (
    <header className="h-20 bg-white border-b flex items-center justify-between px-8">

      <div className="relative">

        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search..."
          className="pl-10 pr-4 py-2 w-80 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

      </div>

      <div className="flex items-center gap-6">

        <Bell
          size={22}
          className="text-slate-600 cursor-pointer"
        />

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            J
          </div>

          <div>
            <p className="font-semibold">Jake</p>
            <p className="text-sm text-slate-500">
              Investor
            </p>
          </div>

        </div>

      </div>

    </header>
  );
}

export default TopBar;