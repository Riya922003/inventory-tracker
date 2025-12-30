import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeaders } from "@/lib/rbac";
import { getUserNotifications, getUnreadCount } from "@/lib/notifications";

// GET - Get user's notifications
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromHeaders(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");
    const status = searchParams.get("status") as "unread" | "read" | null;
    const priority = searchParams.get("priority") as any;

    const notifications = await getUserNotifications(user.userId, {
      limit,
      skip,
      status: status || undefined,
      priority: priority || undefined,
    });

    const unreadCount = await getUnreadCount(user.userId);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
