/**
 * Server-side cache layer using Next.js unstable_cache.
 *
 * Rules for what lives here:
 * - Data that is read far more often than it is written
 * - Data that is safe to serve slightly stale (categories, warehouse names)
 * - NEVER live operational data (stock counts, dashboard stats)
 *
 * Each function is created ONCE at module level — if defined inside a handler
 * a new cache function would be created on every request, defeating the purpose.
 *
 * Invalidation: mutation routes call revalidateTag() from next/cache.
 *
 * Cache key = static prefix + function arguments (companyId).
 * Two companies never share a cache entry.
 */

import { unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import { ProductCategory } from "@/models/ProductCategory";
import { Warehouse } from "@/models/Warehouse";

// ── Tags ─────────────────────────────────────────────────────────────────────
// Exported so mutation routes can import and call revalidateTag(CACHE_TAGS.X)

export const CACHE_TAGS = {
  categories: "categories",
  warehouseNames: "warehouse-names",
} as const;

// ── Categories ────────────────────────────────────────────────────────────────
// Changes only during onboarding. Safe to cache for 1 hour.

const _fetchCategories = unstable_cache(
  async (companyId: string) => {
    await connectDB();
    return ProductCategory.find({ companyId, isActive: true })
      .select("_id name agingConcern")
      .sort({ name: 1 })
      .lean();
  },
  [CACHE_TAGS.categories],
  {
    revalidate: 3600, // 1 hour
    tags: [CACHE_TAGS.categories],
  }
);

export const getCachedCategories = (companyId: string) =>
  _fetchCategories(companyId);

// ── Warehouse names (lightweight, for dropdowns) ──────────────────────────────
// The full GET /api/warehouses calculates metrics and is always fresh.
// This variant returns only {_id, name} for dropdown menus — safe to cache
// for 5 minutes since managers rarely create / rename warehouses.

const _fetchWarehouseNames = unstable_cache(
  async (companyId: string) => {
    await connectDB();
    return Warehouse.find({ companyId, isActive: true })
      .select("_id name")
      .sort({ name: 1 })
      .lean();
  },
  [CACHE_TAGS.warehouseNames],
  {
    revalidate: 300, // 5 minutes
    tags: [CACHE_TAGS.warehouseNames],
  }
);

export const getCachedWarehouseNames = (companyId: string) =>
  _fetchWarehouseNames(companyId);
