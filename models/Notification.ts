import mongoose, { Schema, Document } from "mongoose";

export type NotificationType =
  | "stock_added"
  | "stock_low"
  | "stock_dead"
  | "transfer_initiated"
  | "transfer_completed"
  | "user_joined"
  | "damage_reported"
  | "product_added"
  | "product_updated";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export type NotificationStatus = "unread" | "read";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: mongoose.Types.ObjectId;
  };
  actionUrl?: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  createdAt: Date;
  readAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "stock_added",
        "stock_low",
        "stock_dead",
        "transfer_initiated",
        "transfer_completed",
        "user_joined",
        "damage_reported",
        "product_added",
        "product_updated",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedEntity: {
      type: {
        type: String,
      },
      id: {
        type: Schema.Types.ObjectId,
      },
    },
    actionUrl: { type: String },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    readAt: { type: Date },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
