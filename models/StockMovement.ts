import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMovementPhoto {
  url: string;
  type: "entry" | "exit" | "damage";
}

export interface ITransportDetails {
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  expectedDelivery?: Date;
}

export interface IStockMovement extends Document {
  stockId: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: string;
  performedBy: Types.ObjectId;
  movementType: "in" | "out" | "transfer" | "damage" | "adjustment";
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  reason: string;
  photos: IMovementPhoto[];
  timestamp: Date;
  // Transfer-specific fields
  fromWarehouse?: string;
  fromStockId?: Types.ObjectId;
  toWarehouse?: string;
  toStockId?: Types.ObjectId;
  exitPhoto?: string;
  entryPhoto?: string;
  transportDetails?: ITransportDetails;
  transferStatus?: "initiated" | "in_transit" | "completed" | "cancelled";
  initiatedAt?: Date;
  completedAt?: Date;
  initiatedBy?: Types.ObjectId;
  completedBy?: Types.ObjectId;
  metadata?: any;
}

const MovementPhotoSchema = new Schema<IMovementPhoto>(
  {
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ["entry", "exit", "damage"],
      required: true,
    },
  },
  { _id: false }
);

const TransportDetailsSchema = new Schema<ITransportDetails>(
  {
    vehicleNumber: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    expectedDelivery: { type: Date },
  },
  { _id: false }
);

const StockMovementSchema = new Schema<IStockMovement>(
  {
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
      type: String,
      ref: "Warehouse",
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    movementType: {
      type: String,
      enum: ["in", "out", "transfer", "damage", "adjustment"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
    },
    totalValue: {
      type: Number,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    photos: {
      type: [MovementPhotoSchema],
      default: [],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Transfer-specific fields
    fromWarehouse: {
      type: String,
    },
    fromStockId: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
    },
    toWarehouse: {
      type: String,
    },
    toStockId: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
    },
    exitPhoto: {
      type: String,
    },
    entryPhoto: {
      type: String,
    },
    transportDetails: {
      type: TransportDetailsSchema,
    },
    transferStatus: {
      type: String,
      enum: ["initiated", "in_transit", "completed", "cancelled"],
    },
    initiatedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
StockMovementSchema.index({ stockId: 1 });
StockMovementSchema.index({ timestamp: -1 });
StockMovementSchema.index({ movementType: 1 });
StockMovementSchema.index({ transferStatus: 1 });

export const StockMovement =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>("StockMovement", StockMovementSchema);