import {
  Briefcase,
  LayoutDashboard,
  PieChart,
  Radar,
  Settings,
  Target,
} from "lucide-react";

import {
  NavLink,
} from "react-router-dom";

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
    title: "Market Radar",
    icon: Radar,
    path: "/opportunities",
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
    <aside className="flex w-72 shrink-0 flex-col bg-slate-900 text-white">
      <div className="border-b border-slate-800 px-8 py-10">
        <h1 className="text-5xl font-bold">
          JIS
        </h1>

        <p className="mt-2 text-slate-400">
          Jake Investment System
        </p>
      </div>

      <nav className="mt-8 flex-1 px-4">
        {menu.map((item) => {
          const Icon =
            item.icon;

          return (
            <NavLink
              key={item.title}
              to={item.path}
              end={
                item.path === "/"
              }
              className={({
                isActive,
              }) =>
                `mb-2 flex items-center gap-4 rounded-xl px-5 py-4 transition ${
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