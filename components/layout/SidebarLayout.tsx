"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { FaHome, FaBox, FaWarehouse, FaBell, FaChartBar, FaSignOutAlt, FaSun, FaMoon } from "react-icons/fa";
import { MdInventory } from "react-icons/md";
import { useTheme } from "@/components/ThemeProvider";

interface SidebarUser {
  name: string;
  email: string;
  role: "super_admin" | "warehouse_manager";
  assignedWarehousesCount: number;
}

interface SidebarLayoutProps {
  children: ReactNode;
  user: SidebarUser;
}

const allMenuItems = [
  { name: "Dashboard",  icon: FaHome,      path: "/dashboard",            roles: ["super_admin", "warehouse_manager"] },
  { name: "Inventory",  icon: MdInventory, path: "/dashboard/inventory",  roles: ["super_admin", "warehouse_manager"] },
  { name: "Stock",      icon: FaBox,       path: "/dashboard/stock",      roles: ["super_admin", "warehouse_manager"] },
  { name: "Warehouses", icon: FaWarehouse, path: "/dashboard/warehouses", roles: ["super_admin"] },
  { name: "Alerts",     icon: FaBell,      path: "/dashboard/alerts",     roles: ["super_admin", "warehouse_manager"] },
  { name: "Reports",    icon: FaChartBar,  path: "/dashboard/reports",    roles: ["super_admin", "warehouse_manager"] },
];

export default function SidebarLayout({ children, user }: SidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  const menuItems = allMenuItems.filter(item => item.roles.includes(user.role));

  const getRoleDisplayName = (role: string) =>
    role === "super_admin" ? "Super Admin" : "Warehouse Manager";

  const getUserInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950 dark:border-r dark:border-cyan-500/10 text-white flex flex-col">

        {/* Logo + theme toggle */}
        <div className="p-6 border-b border-indigo-700 dark:border-cyan-500/10 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide">Inventory Tracker</h1>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-700 dark:text-gray-400 dark:hover:text-cyan-400 dark:hover:bg-cyan-500/10 transition-all"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <FaSun className="text-base" /> : <FaMoon className="text-base" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-indigo-700 text-white shadow-lg dark:bg-cyan-500/15 dark:text-cyan-400"
                    : "text-indigo-200 hover:bg-indigo-800 hover:text-white dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                <Icon className="text-lg flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="px-3 py-4 border-t border-indigo-700 dark:border-cyan-500/10">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-800 dark:bg-white/5">
            <div className="w-8 h-8 bg-indigo-500 dark:bg-cyan-500/20 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 dark:text-cyan-400">
              {getUserInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-indigo-300 dark:text-cyan-500/70 truncate">{getRoleDisplayName(user.role)}</p>
              {user.role === "warehouse_manager" && user.assignedWarehousesCount > 0 && (
                <p className="text-xs text-indigo-400 dark:text-gray-500 truncate mt-0.5">
                  {user.assignedWarehousesCount} warehouse(s)
                </p>
              )}
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/");
              } catch {
                router.push("/");
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-indigo-200 hover:bg-indigo-800 hover:text-white dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-all text-sm mt-2"
          >
            <FaSignOutAlt className="text-base" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
