// Role-Based Access Control utilities
import { NextRequest } from "next/server";
import { User } from "@/models/User";
import { connectDB } from "./db";

export type UserRole = "super_admin" | "warehouse_manager";

export interface RequestUser {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
  assignedWarehouses?: string[];
}

// Extract user info from request headers (set by middleware)
export function getUserFromHeaders(req: NextRequest): RequestUser | null {
  const userId = req.headers.get("x-user-id");
  const email = req.headers.get("x-user-email");
  const role = req.headers.get("x-user-role") as UserRole;
  const companyId = req.headers.get("x-company-id");

  if (!userId || !email) {
    return null;
  }

  return {
    userId,
    email,
    role: role || "warehouse_manager",
    companyId: companyId || "",
  };
}

// Get full user details from database
export async function getUserDetails(userId: string) {
  await connectDB();
  const user = await User.findById(userId)
    .select("-password")
    .lean();
  return user;
}

// Permission checking functions
export function canManageUsers(role: UserRole): boolean {
  return role === "super_admin";
}

export function canAddProducts(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager"].includes(role);
}

export function canEditProducts(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager"].includes(role);
}

export function canDeleteProducts(role: UserRole): boolean {
  return role === "super_admin";
}

export function canRecordStockIn(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager"].includes(role);
}

export function canRecordStockOut(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager", "sales"].includes(role);
}

export function canTransferStock(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager"].includes(role);
}

export function canManageWarehouses(role: UserRole): boolean {
  return role === "super_admin";
}

export function canEditWarehouse(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager"].includes(role);
}

export function canViewAllWarehouses(role: UserRole): boolean {
  return ["super_admin", "sales", "auditor", "viewer"].includes(role);
}

export function canGenerateReports(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager", "sales", "auditor", "viewer"].includes(role);
}

export function canExportReports(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager", "sales", "auditor"].includes(role);
}

export function canManageAlerts(role: UserRole): boolean {
  return ["super_admin", "warehouse_manager"].includes(role);
}

export function canViewAlerts(role: UserRole): boolean {
  return true; // All roles can view alerts
}

// Warehouse access control
export function filterWarehousesByAccess(
  warehouses: any[],
  role: UserRole,
  assignedWarehouses: string[]
): any[] {
  // Super admin sees all warehouses
  if (role === "super_admin") {
    return warehouses;
  }

  // Warehouse manager sees only assigned warehouses
  if (role === "warehouse_manager") {
    return warehouses.filter((wh) => assignedWarehouses.includes(wh.code));
  }

  // Sales, auditor, viewer see all warehouses (read-only)
  return warehouses;
}

// Product access control
export function canAccessProduct(
  product: any,
  role: UserRole,
  assignedWarehouses: string[]
): boolean {
  // Super admin can access all products
  if (role === "super_admin") {
    return true;
  }

  // Warehouse manager can only access products in their warehouses
  if (role === "warehouse_manager") {
    return assignedWarehouses.includes(product.warehouseCode);
  }

  // Sales, auditor, viewer can access all products (read-only)
  return true;
}

// Check if user can perform action on specific warehouse
export function canAccessWarehouse(
  warehouseCode: string,
  role: UserRole,
  assignedWarehouses: string[]
): boolean {
  if (role === "super_admin") {
    return true;
  }

  if (role === "warehouse_manager") {
    return assignedWarehouses.includes(warehouseCode);
  }

  // Sales, auditor, viewer can view all warehouses
  return ["sales", "auditor", "viewer"].includes(role);
}

// Middleware helper to check permissions in API routes
export function requireRole(allowedRoles: UserRole[]) {
  return (role: UserRole): boolean => {
    return allowedRoles.includes(role);
  };
}

// Permission matrix for quick reference
export const PERMISSIONS = {
  // Users
  INVITE_USERS: ["super_admin"],
  MANAGE_USERS: ["super_admin"],
  ASSIGN_WAREHOUSES: ["super_admin"],

  // Products
  VIEW_PRODUCTS: ["super_admin", "warehouse_manager", "sales", "auditor", "viewer"],
  ADD_PRODUCTS: ["super_admin", "warehouse_manager"],
  EDIT_PRODUCTS: ["super_admin", "warehouse_manager"],
  DELETE_PRODUCTS: ["super_admin"],

  // Stock
  RECORD_STOCK_IN: ["super_admin", "warehouse_manager"],
  RECORD_STOCK_OUT: ["super_admin", "warehouse_manager", "sales"],
  TRANSFER_STOCK: ["super_admin", "warehouse_manager"],

  // Warehouses
  VIEW_WAREHOUSES: ["super_admin", "warehouse_manager", "sales", "auditor", "viewer"],
  ADD_WAREHOUSE: ["super_admin"],
  EDIT_WAREHOUSE: ["super_admin", "warehouse_manager"],
  DELETE_WAREHOUSE: ["super_admin"],

  // Alerts
  VIEW_ALERTS: ["super_admin", "warehouse_manager", "sales", "auditor", "viewer"],
  ACKNOWLEDGE_ALERTS: ["super_admin", "warehouse_manager"],
  DISMISS_ALERTS: ["super_admin", "warehouse_manager"],

  // Reports
  GENERATE_REPORTS: ["super_admin", "warehouse_manager", "sales", "auditor", "viewer"],
  EXPORT_REPORTS: ["super_admin", "warehouse_manager", "sales", "auditor"],
} as const;

// Helper to check if user has permission
export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}
