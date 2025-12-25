import mongoose, { Schema, Document, Types } from "mongoose";

export interface IEntryPhoto {
  url: string;
  uploadedBy: Types.ObjectId;
  timestamp: Date;
}

export interface IStock extends Document {
  companyId: Types.ObjectId;
  productId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  createdBy: Types.ObjectId;
  batchId: string;
  quantityReceived: number;
  quantityAvailable: number;
  quantityDamaged: number;
  entryDate: Date;
  expiryDate: Date | null;
  ageInDays: number;
  status: "healthy" | "at_risk" | "dead";
  entryPhotos: IEntryPhoto[];
}

const EntryPhotoSchema = new Schema<IEntryPhoto>(
  {
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StockSchema = new Schema<IStock>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "SystemConfig",
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    batchId: {
      type: String,
      required: true,
      unique: true,
    },
    quantityReceived: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityAvailable: {
      type: Number,
      required: true,
      min: 0,
    },
    quantityDamaged: {
      type: Number,
      default: 0,
      min: 0,
    },
    entryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    ageInDays: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["healthy", "at_risk", "dead"],
      default: "healthy",
    },
    entryPhotos: {
      type: [EntryPhotoSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
StockSchema.index({ companyId: 1 });
StockSchema.index({ productId: 1, warehouseId: 1 });
StockSchema.index({ ageInDays: -1 });
StockSchema.index({ status: 1 });

// Pre-save middleware to compute ageInDays
StockSchema.pre("save", function () {
  const now = new Date();
  const entryDate = new Date(this.entryDate);
  const diffTime = Math.abs(now.getTime() - entryDate.getTime());
  this.ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

export const Stock =
  mongoose.models.Stock || mongoose.model<IStock>("Stock", StockSchema);