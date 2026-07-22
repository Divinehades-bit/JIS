import {
  LayoutDashboard,
  Briefcase,
  PieChart,
  Target,
  Settings,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const menu = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    title: "Portfolio",
    icon: Briefcase,
    path: "/portfolio",
  },
  {
    title: "Analytics",
    icon: PieChart,
    path: "/analytics",
  },
  {
    title: "Goals",
    icon: Target,
    path: "/goals",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

function Sidebar() {
  return (
    <aside className="w-72 bg-slate-900 text-white flex flex-col">

      <div className="px-8 py-10 border-b border-slate-800">

        <h1 className="text-5xl font-bold">
          JIS
        </h1>

        <p className="text-slate-400 mt-2">
          Jake Investment System
        </p>

      </div>

      <nav className="flex-1 mt-8 px-4">

        {menu.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.title}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center gap-4 px-5 py-4 rounded-xl mb-2 transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <Icon size={22} />

              <span className="text-lg font-medium">
                {item.title}
              </span>
            </NavLink>
          );
        })}

      </nav>

    </aside>
  );
}

export default Sidebar;