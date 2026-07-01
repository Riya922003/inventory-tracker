import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { SystemConfig } from "@/models/SystemConfig";
import SidebarLayout from "@/components/layout/SidebarLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read JWT from cookie — runs server-side, zero round trip
  const jwtPayload = await getCurrentUser();

  if (!jwtPayload) {
    redirect("/login");
  }

  // Fetch the user's display name and warehouse assignments from DB.
  // This runs once on the server during SSR — not on every client navigation.
  await connectDB();
  const dbUser = await User.findById(jwtPayload.userId)
    .select("name email role assignedWarehouses companyId")
    .lean<{
      name: string;
      email: string;
      role: "super_admin" | "warehouse_manager";
      assignedWarehouses?: unknown[];
      companyId?: unknown;
    }>();

  if (!dbUser) {
    redirect("/login");
  }

  const company = dbUser.companyId
    ? await SystemConfig.findById(dbUser.companyId).select("companyName").lean<{ companyName?: string }>()
    : null;

  const user = {
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    assignedWarehousesCount: dbUser.assignedWarehouses?.length ?? 0,
    companyName: company?.companyName ?? "",
  };

  return <SidebarLayout user={user}>{children}</SidebarLayout>;
}
