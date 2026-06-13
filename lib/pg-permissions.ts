// PostgreSQL permission store — all reads and writes go through here
// This is the Layer 2 permission source of truth.
// MongoDB's assignedWarehouses field still exists for reference,
// but these functions are what the API routes use for access control.

import { supabaseAdmin } from "./supabase";

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Check if a user can access a specific warehouse.
 * Returns false if the query fails — fail closed, never allow on error.
 */
export async function hasWarehouseAccess(
  userId: string,
  warehouseId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("user_warehouse_permissions")
    .select("user_id")
    .eq("user_id", userId)
    .eq("warehouse_id", warehouseId)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found — expected, not an error
    console.error("Permission check error:", error);
  }

  return !!data;
}

/**
 * Get all warehouse IDs a user can access.
 * Returns empty array on error — caller should handle gracefully.
 */
export async function getUserWarehouseIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("user_warehouse_permissions")
    .select("warehouse_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user warehouse IDs:", error);
    return [];
  }

  return data?.map((row) => row.warehouse_id) ?? [];
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Seed all warehouse permissions for a user in one call.
 * Used when a manager accepts their invitation.
 */
export async function seedUserPermissions(
  userId: string,
  warehouseIds: string[],
  role: "super_admin" | "warehouse_manager",
  companyId: string
): Promise<void> {
  if (warehouseIds.length === 0) return;

  const rows = warehouseIds.map((warehouseId) => ({
    user_id: userId,
    warehouse_id: warehouseId,
    role,
    company_id: companyId,
  }));

  const { error } = await supabaseAdmin
    .from("user_warehouse_permissions")
    .upsert(rows, { onConflict: "user_id,warehouse_id" });

  if (error) {
    console.error("Error seeding user permissions:", error);
    throw new Error("Failed to seed user permissions in permission store");
  }
}

/**
 * Grant a single warehouse permission to a user.
 * Used when admin assigns an additional warehouse to a manager.
 */
export async function grantWarehouseAccess(
  userId: string,
  warehouseId: string,
  role: "super_admin" | "warehouse_manager",
  companyId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_warehouse_permissions")
    .upsert(
      { user_id: userId, warehouse_id: warehouseId, role, company_id: companyId },
      { onConflict: "user_id,warehouse_id" }
    );

  if (error) {
    console.error("Error granting warehouse access:", error);
    throw new Error("Failed to grant warehouse access in permission store");
  }
}

/**
 * Revoke a single warehouse permission from a user.
 * Used when admin removes a warehouse from a manager.
 */
export async function revokeWarehouseAccess(
  userId: string,
  warehouseId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_warehouse_permissions")
    .delete()
    .eq("user_id", userId)
    .eq("warehouse_id", warehouseId);

  if (error) {
    console.error("Error revoking warehouse access:", error);
    throw new Error("Failed to revoke warehouse access in permission store");
  }
}

/**
 * Remove all permissions for a user.
 * Used when a manager account is deleted.
 */
export async function revokeAllUserPermissions(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_warehouse_permissions")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Error revoking all user permissions:", error);
    throw new Error("Failed to remove user from permission store");
  }
}

/**
 * Remove all permissions for a warehouse.
 * Used when a warehouse is deleted — ensures no manager retains access to a ghost warehouse.
 */
export async function revokeAllWarehousePermissions(
  warehouseId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("user_warehouse_permissions")
    .delete()
    .eq("warehouse_id", warehouseId);

  if (error) {
    console.error("Error revoking warehouse permissions:", error);
    throw new Error("Failed to remove warehouse from permission store");
  }
}
