/**
 * Dashboard page — async Server Component.
 *
 * Data is fetched on the server during SSR, so:
 * - No "Loading dashboard..." blank screen
 * - No extra browser→server round trip
 * - getDashboardData() uses Promise.all + lookup maps (4 round trips, 3 parallel)
 *   instead of the old sequential 7 round trips
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getDashboardData } from "@/lib/dashboard-data";
import DashboardView from "./DashboardView";

// Never cache this page — inventory data changes frequently
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Auth check — server-side, no extra round trip
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/");
  }

  await connectDB();

  const user = await User.findById(currentUser.userId).lean();

  if (!user || !(user as any).companyId) {
    redirect("/onboarding");
  }

  const u = user as any;

  // Read the ?error= param passed by the middleware/redirects
  const params = await searchParams;
  const initialError =
    params.error === "unauthorized"
      ? "You don't have permission to access that page"
      : null;

  // Fetch all dashboard data server-side — optimised, parallel queries
  const data = await getDashboardData(
    u.companyId.toString(),
    u.role ?? "warehouse_manager",
    (u.assignedWarehouses ?? []).map((id: any) => id.toString())
  );

  // Pass pre-fetched data to the client component that handles interactions
  return <DashboardView data={data} initialError={initialError} />;
}
