"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import posthog from "posthog-js";
import {
  FaHome, FaBox, FaWarehouse, FaBell, FaChartBar,
  FaSignOutAlt, FaSun, FaMoon, FaBars, FaTimes,
} from "react-icons/fa";
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
  { name: "Products",   icon: FaBox,       path: "/dashboard/inventory",  roles: ["super_admin", "warehouse_manager"] },
  { name: "Warehouses", icon: FaWarehouse, path: "/dashboard/warehouses", roles: ["super_admin"] },
  { name: "Alerts",     icon: FaBell,      path: "/dashboard/alerts",     roles: ["super_admin", "warehouse_manager"] },
  { name: "Reports",    icon: FaChartBar,  path: "/dashboard/reports",    roles: ["super_admin", "warehouse_manager"] },
];

export default function SidebarLayout({ children, user }: SidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    posthog.identify(user.email, {
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }, [user.email, user.name, user.role]);

  const menuItems = allMenuItems.filter(item => item.roles.includes(user.role));

  const getRoleDisplayName = (role: string) =>
    role === "super_admin" ? "Super Admin" : "Warehouse Manager";

  const getUserInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const navigate = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo + controls */}
      <div className="p-5 border-b border-indigo-700 dark:border-cyan-500/10 flex items-center justify-between flex-shrink-0">
        <h1 className="text-lg font-bold tracking-wide">Inventory Tracker</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-700 dark:text-gray-400 dark:hover:text-cyan-400 dark:hover:bg-cyan-500/10 transition-all"
          >
            {theme === "dark" ? <FaSun className="text-sm" /> : <FaMoon className="text-sm" />}
          </button>
          {/* Close button — mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-700 transition-all"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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

      {/* User section */}
      <div className="px-3 py-4 border-t border-indigo-700 dark:border-cyan-500/10 flex-shrink-0">
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
            try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-indigo-200 hover:bg-indigo-800 hover:text-white dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition-all text-sm mt-2"
        >
          <FaSignOutAlt className="text-base" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* ── Mobile backdrop ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {/* Mobile: fixed overlay that slides in from left                        */}
      {/* Desktop: static flex column, always visible                           */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex flex-col
          bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900
          dark:from-gray-950 dark:via-gray-950 dark:to-gray-950
          dark:border-r dark:border-cyan-500/10
          text-white
          transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {sidebarContent}
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar — hidden on desktop */}
        <div className="md:hidden flex-shrink-0 flex items-center gap-3 px-4 h-14 bg-indigo-900 dark:bg-gray-950 dark:border-b dark:border-cyan-500/10 text-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-800 transition-all"
            aria-label="Open menu"
          >
            <FaBars className="text-lg" />
          </button>
          <span className="font-bold flex-1">Inventory Tracker</span>
          <button
            onClick={toggle}
            className="p-2 rounded-lg text-indigo-300 hover:text-white transition-all"
          >
            {theme === "dark" ? <FaSun className="text-base" /> : <FaMoon className="text-base" />}
          </button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
