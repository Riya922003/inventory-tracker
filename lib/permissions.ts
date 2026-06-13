// Permission utilities for route-level access control
// The middleware handles authentication. These helpers handle authorisation
// (what an authenticated user is allowed to do).

import { NextResponse } from "next/server";

export type UserRole = "super_admin" | "warehouse_manager";

// ─── Response helpers ────────────────────────────────────────────────────────

export function forbiddenResponse(message = "Access denied") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// ─── Role checks ─────────────────────────────────────────────────────────────

export function isSuperAdmin(user: { role: string }): boolean {
  return user.role === "super_admin";
}

export function isWarehouseManager(user: { role: string }): boolean {
  return user.role === "warehouse_manager";
}

// ─── Warehouse access ─────────────────────────────────────────────────────────

/**
 * Returns true if the user can access the given warehouse.
 * Super admins can access everything.
 * Warehouse managers can only access their assigned warehouses.
 */
export function canAccessWarehouse(
  user: { role: string; assignedWarehouses?: any[] },
  warehouseId: string
): boolean {
  if (user.role === "super_admin") return true;
  return (
    user.assignedWarehouses?.some(
      (id: any) => id.toString() === warehouseId.toString()
    ) ?? false
  );
}

/**
 * Returns the list of warehouse IDs the user can access.
 * Returns null for super admins (meaning: no filter — all warehouses).
 * Returns an array of string IDs for warehouse managers.
 */
export function getAccessibleWarehouseIds(user: {
  role: string;
  assignedWarehouses?: any[];
}): string[] | null {
  if (user.role === "super_admin") return null;
  return user.assignedWarehouses?.map((id: any) => id.toString()) ?? [];
}

/**
 * Build a MongoDB $in filter for warehouse IDs based on the user's access.
 * Returns undefined for super admins (no filter needed).
 * Returns { $in: [...ids] } for warehouse managers.
 */
export function warehouseFilter(user: {
  role: string;
  assignedWarehouses?: any[];
}): { $in: string[] } | undefined {
  const ids = getAccessibleWarehouseIds(user);
  if (ids === null) return undefined; // super admin — no filter
  return { $in: ids };
}
