import { NextRequest, NextResponse } from "next/server";
import { getUserFromHeaders } from "@/lib/rbac";
import { markAllNotificationsAsRead } from "@/lib/notifications";

// POST - Mark all notifications as read
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromHeaders(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await markAllNotificationsAsRead(user.userId);

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
