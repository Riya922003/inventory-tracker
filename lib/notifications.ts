// Notification service for 2-role system (super_admin and warehouse_manager)
import { Notification, NotificationType, NotificationPriority } from "@/models/Notification";
import { User } from "@/models/User";
import { connectDB } from "./db";
import mongoose from "mongoose";

interface CreateNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string | mongoose.Types.ObjectId;
  };
  actionUrl?: string;
  priority?: NotificationPriority;
}

/**
 * Create a notification for a specific user
 */
export async function createNotification(params: CreateNotificationParams) {
  await connectDB();

  const notification = await Notification.create({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    relatedEntity: params.relatedEntity,
    actionUrl: params.actionUrl,
    priority: params.priority || "medium",
    status: "unread",
  });

  return notification;
}

/**
 * Notify super admin when warehouse manager adds stock
 */
export async function notifyStockAdded(params: {
  managerName: string;
  productName: string;
  quantity: number;
  warehouseCode: string;
  stockMovementId: string;
}) {
  await connectDB();

  // Get all super admins
  const superAdmins = await User.find({ role: "super_admin" });

  const notifications = superAdmins.map((admin) =>
    createNotification({
      userId: admin._id,
      type: "stock_added",
      title: "Stock Added",
      message: `${params.managerName} added ${params.quantity} units of ${params.productName} to ${params.warehouseCode}`,
      relatedEntity: {
        type: "stock_movement",
        id: params.stockMovementId,
      },
      actionUrl: `/dashboard/stock/movements/${params.stockMovementId}`,
      priority: "low",
    })
  );

  await Promise.all(notifications);
}

/**
 * Notify warehouse manager when stock is low in their warehouse
 */
export async function notifyStockLow(params: {
  warehouseCode: string;
  productName: string;
  currentQuantity: number;
  minQuantity: number;
  productId: string;
}) {
  await connectDB();

  // Get warehouse managers assigned to this warehouse
  const managers = await User.find({
    role: "warehouse_manager",
    assignedWarehouses: params.warehouseCode,
  });

  const notifications = managers.map((manager) =>
    createNotification({
      userId: manager._id,
      type: "stock_low",
      title: "Low Stock Alert",
      message: `${params.productName} in ${params.warehouseCode} is running low (${params.currentQuantity}/${params.minQuantity})`,
      relatedEntity: {
        type: "product",
        id: params.productId,
      },
      actionUrl: `/dashboard/inventory?warehouse=${params.warehouseCode}`,
      priority: "high",
    })
  );

  await Promise.all(notifications);
}

/**
 * Notify warehouse manager when stock is dead (no movement for long time)
 */
export async function notifyStockDead(params: {
  warehouseCode: string;
  productName: string;
  daysSinceLastMovement: number;
  productId: string;
}) {
  await connectDB();

  // Get warehouse managers assigned to this warehouse
  const managers = await User.find({
    role: "warehouse_manager",
    assignedWarehouses: params.warehouseCode,
  });

  const notifications = managers.map((manager) =>
    createNotification({
      userId: manager._id,
      type: "stock_dead",
      title: "Dead Stock Alert",
      message: `${params.productName} in ${params.warehouseCode} has no movement for ${params.daysSinceLastMovement} days`,
      relatedEntity: {
        type: "product",
        id: params.productId,
      },
      actionUrl: `/dashboard/inventory?warehouse=${params.warehouseCode}`,
      priority: "medium",
    })
  );

  await Promise.all(notifications);
}

/**
 * Notify both warehouse managers when transfer is initiated
 */
export async function notifyTransferInitiated(params: {
  initiatorName: string;
  productName: string;
  quantity: number;
  fromWarehouse: string;
  toWarehouse: string;
  transferId: string;
}) {
  await connectDB();

  // Get managers for both warehouses
  const managers = await User.find({
    role: "warehouse_manager",
    assignedWarehouses: { $in: [params.fromWarehouse, params.toWarehouse] },
  });

  const notifications = managers.map((manager) =>
    createNotification({
      userId: manager._id,
      type: "transfer_initiated",
      title: "Stock Transfer Initiated",
      message: `${params.initiatorName} initiated transfer of ${params.quantity} units of ${params.productName} from ${params.fromWarehouse} to ${params.toWarehouse}`,
      relatedEntity: {
        type: "stock_movement",
        id: params.transferId,
      },
      actionUrl: `/dashboard/stock/transfers/${params.transferId}`,
      priority: "medium",
    })
  );

  await Promise.all(notifications);
}

/**
 * Notify both warehouse managers when transfer is completed
 */
export async function notifyTransferCompleted(params: {
  productName: string;
  quantity: number;
  fromWarehouse: string;
  toWarehouse: string;
  transferId: string;
}) {
  await connectDB();

  // Get managers for both warehouses
  const managers = await User.find({
    role: "warehouse_manager",
    assignedWarehouses: { $in: [params.fromWarehouse, params.toWarehouse] },
  });

  const notifications = managers.map((manager) =>
    createNotification({
      userId: manager._id,
      type: "transfer_completed",
      title: "Stock Transfer Completed",
      message: `Transfer of ${params.quantity} units of ${params.productName} from ${params.fromWarehouse} to ${params.toWarehouse} is complete`,
      relatedEntity: {
        type: "stock_movement",
        id: params.transferId,
      },
      actionUrl: `/dashboard/stock/transfers/${params.transferId}`,
      priority: "low",
    })
  );

  await Promise.all(notifications);
}

/**
 * Notify super admin when user accepts invitation
 */
export async function notifyUserJoined(params: {
  newUserName: string;
  newUserEmail: string;
  newUserRole: string;
  newUserId: string;
  invitedBy: string;
}) {
  await connectDB();

  // Notify the super admin who invited them
  await createNotification({
    userId: params.invitedBy,
    type: "user_joined",
    title: "New Team Member Joined",
    message: `${params.newUserName} (${params.newUserEmail}) has accepted your invitation and joined as ${params.newUserRole}`,
    relatedEntity: {
      type: "user",
      id: params.newUserId,
    },
    actionUrl: `/dashboard/users/${params.newUserId}`,
    priority: "low",
  });
}

/**
 * Notify super admin and warehouse manager when damage is reported
 */
export async function notifyDamageReported(params: {
  reportedBy: string;
  productName: string;
  quantity: number;
  warehouseCode: string;
  damageId: string;
  reason?: string;
}) {
  await connectDB();

  // Get super admins
  const superAdmins = await User.find({ role: "super_admin" });

  // Get warehouse managers for this warehouse
  const managers = await User.find({
    role: "warehouse_manager",
    assignedWarehouses: params.warehouseCode,
  });

  // Combine both
  const usersToNotify = [...superAdmins, ...managers];

  const notifications = usersToNotify.map((user) =>
    createNotification({
      userId: user._id,
      type: "damage_reported",
      title: "Damage Reported",
      message: `${params.reportedBy} reported damage: ${params.quantity} units of ${params.productName} in ${params.warehouseCode}${params.reason ? ` - ${params.reason}` : ""}`,
      relatedEntity: {
        type: "stock_movement",
        id: params.damageId,
      },
      actionUrl: `/dashboard/stock/damage/${params.damageId}`,
      priority: "high",
    })
  );

  await Promise.all(notifications);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  await connectDB();

  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    {
      status: "read",
      readAt: new Date(),
    },
    { new: true }
  );

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  await connectDB();

  await Notification.updateMany(
    { userId, status: "unread" },
    {
      status: "read",
      readAt: new Date(),
    }
  );
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  await connectDB();

  const count = await Notification.countDocuments({
    userId,
    status: "unread",
  });

  return count;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options: {
    limit?: number;
    skip?: number;
    status?: "unread" | "read";
    priority?: NotificationPriority;
  } = {}
) {
  await connectDB();

  const query: any = { userId };

  if (options.status) {
    query.status = options.status;
  }

  if (options.priority) {
    query.priority = options.priority;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .lean();

  return notifications;
}

/**
 * Delete old read notifications (cleanup)
 */
export async function deleteOldNotifications(daysOld: number = 30) {
  await connectDB();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await Notification.deleteMany({
    status: "read",
    readAt: { $lt: cutoffDate },
  });

  return result.deletedCount;
}
