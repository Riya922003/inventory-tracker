// Simplified permission system for RBAC - Only 2 roles
import { UserRole } from "./rbac";

export type Resource = "inventory" | "stock" | "warehouses" | "alerts" | "reports" | "users";

export type Action =
  | "view_all"
  | "view_own"
  | "add"
  | "edit"
  | "delete"
  | "transfer"
  | "record_in"
  | "record_out"
  | "acknowledge"
  | "dismiss"
  | "generate"
  | "export"
  | "invite";

interface RolePermissions {
  [key: string]: Action[];
}

interface PermissionMatrix {
  [role: string]: RolePermissions;
}

// Simplified to just 2 roles: super_admin and warehouse_manager
export const PERMISSIONS: PermissionMatrix = {
  super_admin: {
    inventory: ["view_all", "add", "edit", "delete"],
    stock: ["view_all", "add", "record_in", "record_out", "edit", "transfer"],
    warehouses: ["view_all", "add", "edit", "delete"],
    alerts: ["view_all", "acknowledge", "dismiss"],
    reports: ["view_all", "generate", "export"],
    users: ["view_all", "invite", "edit", "delete"],
  },
  warehouse_manager: {
    inventory: ["view_own", "add", "edit"],
    stock: ["view_own", "record_in", "record_out", "edit", "transfer"],
    warehouses: ["view_own", "edit"],
    alerts: ["view_own", "acknowledge", "dismiss"],
    reports: ["view_own", "generate", "export"],
    users: [],
  },
};

/**
 * Check if a user role has permission to perform an action on a resource
 * @param userRole - The role of the user (super_admin or warehouse_manager)
 * @param resource - The resource being accessed
 * @param action - The action being performed
 * @returns boolean - true if user has permission
 */
export function hasPermission(
  userRole: UserRole,
  resource: Resource,
  action: Action
): boolean {
  const rolePermissions = PERMISSIONS[userRole] || {};
  const resourcePermissions = rolePermissions[resource] || [];

  // Check if user has the specific action permission
  if (resourcePermissions.includes(action)) {
    return true;
  }

  // If checking for view_own, also allow if user has view_all
  if (action === "view_own" && resourcePermissions.includes("view_all")) {
    return true;
  }

  return false;
}

/**
 * Check if user can access a specific warehouse
 * @param userRole - The role of the user
 * @param warehouseCode - The warehouse code to check access for
 * @param assignedWarehouses - Array of warehouse codes assigned to the user
 * @returns boolean - true if user can access the warehouse
 */
export function canAccessWarehouse(
  userRole: UserRole,
  warehouseCode: string,
  assignedWarehouses: string[]
): boolean {
  // Super admin can access all warehouses
  if (userRole === "super_admin") {
    return true;
  }

  // Warehouse manager can only access assigned warehouses
  if (userRole === "warehouse_manager") {
    return assignedWarehouses.includes(warehouseCode);
  }

  return false;
}

/**
 * Get all permissions for a specific role
 * @param userRole - The role to get permissions for
 * @returns Object containing all permissions for the role
 */
export function getRolePermissions(userRole: UserRole): RolePermissions {
  return PERMISSIONS[userRole] || {};
}

/**
 * Check if user can perform any action on a resource
 * @param userRole - The role of the user
 * @param resource - The resource being checked
 * @returns boolean - true if user has any permission on the resource
 */
export function canAccessResource(userRole: UserRole, resource: Resource): boolean {
  const rolePermissions = PERMISSIONS[userRole] || {};
  const resourcePermissions = rolePermissions[resource] || [];
  return resourcePermissions.length > 0;
}

/**
 * Get all actions a user can perform on a resource
 * @param userRole - The role of the user
 * @param resource - The resource to check
 * @returns Array of actions the user can perform
 */
export function getResourceActions(userRole: UserRole, resource: Resource): Action[] {
  const rolePermissions = PERMISSIONS[userRole] || {};
  return rolePermissions[resource] || [];
}

/**
 * Filter items based on warehouse access
 * @param items - Array of items with warehouseCode property
 * @param userRole - The role of the user
 * @param assignedWarehouses - Array of warehouse codes assigned to the user
 * @returns Filtered array of items user can access
 */
export function filterByWarehouseAccess<T extends { warehouseCode: string }>(
  items: T[],
  userRole: UserRole,
  assignedWarehouses: string[]
): T[] {
  // Super admin sees everything
  if (userRole === "super_admin") {
    return items;
  }

  // Warehouse manager sees only assigned warehouses
  if (userRole === "warehouse_manager") {
    return items.filter((item) => assignedWarehouses.includes(item.warehouseCode));
  }

  return items;
}

/**
 * Check if user needs warehouse filtering
 * @param userRole - The role of the user
 * @returns boolean - true if user's data should be filtered by warehouse
 */
export function needsWarehouseFiltering(userRole: UserRole): boolean {
  return userRole === "warehouse_manager";
}

/**
 * Get user's scope for a resource (all or own)
 * @param userRole - The role of the user
 * @param resource - The resource to check
 * @returns "all" | "own" | "none"
 */
export function getResourceScope(
  userRole: UserRole,
  resource: Resource
): "all" | "own" | "none" {
  const rolePermissions = PERMISSIONS[userRole] || {};
  const resourcePermissions = rolePermissions[resource] || [];

  if (resourcePermissions.includes("view_all")) {
    return "all";
  }

  if (resourcePermissions.includes("view_own")) {
    return "own";
  }

  return "none";
}

// Export permission constants for easy reference
export const PERMISSION_ACTIONS = {
  VIEW_ALL: "view_all" as Action,
  VIEW_OWN: "view_own" as Action,
  ADD: "add" as Action,
  EDIT: "edit" as Action,
  DELETE: "delete" as Action,
  TRANSFER: "transfer" as Action,
  RECORD_IN: "record_in" as Action,
  RECORD_OUT: "record_out" as Action,
  ACKNOWLEDGE: "acknowledge" as Action,
  DISMISS: "dismiss" as Action,
  GENERATE: "generate" as Action,
  EXPORT: "export" as Action,
  INVITE: "invite" as Action,
} as const;

export const RESOURCES = {
  INVENTORY: "inventory" as Resource,
  STOCK: "stock" as Resource,
  WAREHOUSES: "warehouses" as Resource,
  ALERTS: "alerts" as Resource,
  REPORTS: "reports" as Resource,
  USERS: "users" as Resource,
} as const;
