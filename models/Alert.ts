import mongoose, { Schema, Document } from "mongoose";

export interface IAlert extends Document {
  companyId: mongoose.Types.ObjectId;
  stockId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  type: "dead_inventory" | "aging" | "low_stock" | "expiry_warning";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  recommendation: string;
  status: "open" | "acknowledged" | "resolved" | "dismissed";
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolvedNotes?: string;
  metadata: {
    ageInDays?: number;
    quantity?: number;
    value?: number;
    expiryDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "SystemConfig",
      required: true,
    },
    stockId: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    type: {
      type: String,
      enum: ["dead_inventory", "aging", "low_stock", "expiry_warning"],
      required: true,
    },
    severity: {
      type: String,
      enum: ["critical", "warning", "info"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    recommendation: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "acknowledged", "resolved", "dismissed"],
      default: "open",
    },
    acknowledgedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    acknowledgedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },
    resolvedNotes: {
      type: String,
    },
    metadata: {
      ageInDays: { type: Number },
      quantity: { type: Number },
      value: { type: Number },
      expiryDate: { type: Date },
    },
  },
  { timestamps: true }
);

// Indexes
AlertSchema.index({ companyId: 1, status: 1 });
AlertSchema.index({ stockId: 1 });
AlertSchema.index({ type: 1, severity: 1 });
AlertSchema.index({ createdAt: -1 });

export const Alert =
  mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);
