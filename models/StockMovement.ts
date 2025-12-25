import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMovementPhoto {
  url: string;
  type: "entry" | "exit" | "damage";
}

export interface IStockMovement extends Document {
  stockId: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: string;
  performedBy: Types.ObjectId;
  movementType: "in" | "out" | "transfer" | "damage" | "adjustment";
  quantity: number;
  reason: string;
  photos: IMovementPhoto[];
  timestamp: Date;
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
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
StockMovementSchema.index({ stockId: 1 });
StockMovementSchema.index({ timestamp: -1 });

export const StockMovement =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>("StockMovement", StockMovementSchema);