"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FaBell,
  FaBoxOpen,
  FaExclamationTriangle,
  FaSkullCrossbones,
  FaExchangeAlt,
  FaUserPlus,
  FaTools,
  FaCheckDouble,
} from "react-icons/fa";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  status: "unread" | "read";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: string;
}

const typeIcon: Record<string, any> = {
  stock_added: FaBoxOpen,
  stock_low: FaExclamationTriangle,
  stock_dead: FaSkullCrossbones,
  transfer_initiated: FaExchangeAlt,
  transfer_completed: FaExchangeAlt,
  user_joined: FaUserPlus,
  damage_reported: FaTools,
  product_added: FaBoxOpen,
  product_updated: FaBoxOpen,
};

function priorityBadge(priority: string) {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400";
    case "medium":
      return "bg-blue-100 text-blue-700 dark:bg-cyan-500/15 dark:text-cyan-400";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "unread") params.set("status", "unread");
      const res = await fetch(`/api/notifications?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setItems(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } else {
        toast.error(data.error || "Failed to load notifications");
      }
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        credentials: "include",
      });
      toast.success("All notifications marked as read");
      fetchData();
    } catch {
      toast.error("Failed to mark notifications as read");
    }
  };

  const openNotification = async (n: NotificationItem) => {
    if (n.status === "unread") {
      try {
        await fetch(`/api/notifications/${n._id}`, {
          method: "PATCH",
          credentials: "include",
        });
      } catch {
        // non-fatal — still navigate
      }
    }
    if (n.actionUrl) {
      router.push(n.actionUrl);
    } else {
      fetchData();
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm font-medium ${
                filter === "all"
                  ? "bg-indigo-600 text-white dark:bg-cyan-500 dark:text-gray-950"
                  : "bg-white dark:bg-transparent text-gray-600 dark:text-gray-400"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 text-sm font-medium ${
                filter === "unread"
                  ? "bg-indigo-600 text-white dark:bg-cyan-500 dark:text-gray-950"
                  : "bg-white dark:bg-transparent text-gray-600 dark:text-gray-400"
              }`}
            >
              Unread
            </button>
          </div>
          <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
            <FaCheckDouble className="mr-2" /> Mark all read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{filter === "unread" ? "Unread" : "All"} notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <FaBell className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No notifications</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {filter === "unread" ? "Nothing unread right now." : "You'll see updates here as they happen."}
              </p>
            </div>
          ) : (
            <div className="divide-y dark:divide-white/5">
              {items.map((n) => {
                const Icon = typeIcon[n.type] ?? FaBell;
                return (
                  <button
                    key={n._id}
                    onClick={() => openNotification(n)}
                    className={`w-full flex items-start gap-4 py-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors px-2 -mx-2 rounded-lg ${
                      n.status === "unread" ? "bg-indigo-50/50 dark:bg-cyan-500/5" : ""
                    }`}
                  >
                    <div className="mt-0.5 text-gray-400 dark:text-gray-500 flex-shrink-0">
                      <Icon className="text-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{n.title}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityBadge(n.priority)}`}>
                          {n.priority}
                        </span>
                        {n.status === "unread" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-cyan-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {new Date(n.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
