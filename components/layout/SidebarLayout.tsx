"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { 
  FaHome, 
  FaBox, 
  FaWarehouse, 
  FaBell, 
  FaChartBar, 
  FaPlus,
  FaFileImport,
  FaUsers,
  FaSignOutAlt
} from "react-icons/fa";
import { MdInventory, MdLogout } from "react-icons/md";
import { Button } from "@/components/ui/button";

interface SidebarLayoutProps {
  children: ReactNode;
}

interface Warehouse {
  _id: string;
  name: string;
  warehouseCode: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "warehouse_manager";
  assignedWarehouses?: Warehouse[];
}

const allMenuItems = [
  { name: "Dashboard", icon: FaHome, path: "/dashboard", roles: ["super_admin", "warehouse_manager"] },
  { name: "Inventory", icon: MdInventory, path: "/dashboard/inventory", roles: ["super_admin", "warehouse_manager"] },
  { name: "Stock", icon: FaBox, path: "/dashboard/stock", roles: ["super_admin", "warehouse_manager"] },
  { name: "Warehouses", icon: FaWarehouse, path: "/dashboard/warehouses", roles: ["super_admin"] },
  { name: "Alerts", icon: FaBell, path: "/dashboard/alerts", roles: ["super_admin", "warehouse_manager"] },
  { name: "Reports", icon: FaChartBar, path: "/dashboard/reports", roles: ["super_admin", "warehouse_manager"] },
];

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Fetch current user info from API
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else if (response.status === 401) {
          // Not authenticated, redirect to login
          router.push('/');
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [router]);

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  // Role-based permissions for quick actions
  const canInviteUsers = user?.role === "super_admin";
  const canImportCSV = true; // Both roles can import
  const canAddProduct = true; // Both roles can add products

  const quickActions = [
    { 
      name: "Add Product", 
      icon: FaPlus, 
      action: "add-product",
      show: canAddProduct 
    },
    { 
      name: "Import CSV", 
      icon: FaFileImport, 
      action: "import",
      show: canImportCSV 
    },
    { 
      name: "Invite Team", 
      icon: FaUsers, 
      action: "invite",
      show: canInviteUsers 
    },
  ].filter(action => action.show);

  const handleQuickAction = (action: string) => {
    if (action === "add-product") {
      router.push("/dashboard/products/new");
    } else if (action === "invite") {
      router.push("/dashboard/users/invite");
    } else if (action === "import") {
      // TODO: Open import modal
      console.log("Import CSV");
    }
  };

  // Get role display name
  const getRoleDisplayName = (role: string) => {
    return role === "super_admin" ? "Super Admin" : "Warehouse Manager";
  };

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-indigo-900 via-indigo-800 to-indigo-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-indigo-700">
          <h1 className="text-2xl font-bold tracking-wide">InsydTracker</h1>
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
                    ? "bg-indigo-700 text-white shadow-lg"
                    : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
                }`}
              >
                <Icon className="text-lg flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Actions - Role-based */}
        {quickActions.length > 0 && (
          <div className="px-3 py-4 border-t border-indigo-700">
            <p className="text-xs uppercase tracking-wider text-indigo-300 px-4 mb-3 font-semibold">
              Quick Actions
            </p>
            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.action}
                    onClick={() => handleQuickAction(action.action)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-indigo-200 hover:bg-indigo-800 hover:text-white transition-all text-sm"
                  >
                    <Icon className="text-base flex-shrink-0" />
                    <span>{action.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* User Section - Role-based */}
        <div className="px-3 py-4 border-t border-indigo-700">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-800">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center font-semibold text-sm">
              {user ? getUserInitials(user.name) : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-indigo-300 truncate">
                {user ? getRoleDisplayName(user.role) : "Loading..."}
              </p>
              {user?.role === "warehouse_manager" && user.assignedWarehouses && (
                <p className="text-xs text-indigo-400 truncate mt-0.5">
                  {user.assignedWarehouses.length} warehouse(s)
                </p>
              )}
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST" });
                router.push("/");
              } catch (error) {
                console.error("Logout error:", error);
                router.push("/");
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-indigo-200 hover:bg-indigo-800 hover:text-white transition-all text-sm mt-2"
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
