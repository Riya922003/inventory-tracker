import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
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
    .select("name email role assignedWarehouses")
    .lean<{
      name: string;
      email: string;
      role: "super_admin" | "warehouse_manager";
      assignedWarehouses?: unknown[];
    }>();

  if (!dbUser) {
    redirect("/login");
  }

  const user = {
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    assignedWarehousesCount: dbUser.assignedWarehouses?.length ?? 0,
  };

  return <SidebarLayout user={user}>{children}</SidebarLayout>;
}
