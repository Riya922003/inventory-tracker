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
  parentBatchId: string | null;
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
    },
    // null = original batch from supplier
    // "SANDSTONE-001" = this document was created by a transfer
    parentBatchId: {
      type: String,
      default: null,
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
      min: 0,
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
  { timestamps: true }
);

// ---- INDEXES ----

// Most common dashboard query - fetch all stock for a company
StockSchema.index({ companyId: 1 });

// Warehouse page - fetch stock for specific warehouse
StockSchema.index({ companyId: 1, warehouseId: 1 });

// Dashboard status filters - dead stock, at risk counts
StockSchema.index({ companyId: 1, status: 1 });

// Cron job - finds all stocks needing age update
StockSchema.index({ ageInDays: -1 });

// Warehouse status breakdown
StockSchema.index({ warehouseId: 1, status: 1 });

// Transfer chain tracing - find all documents from same original batch
StockSchema.index({ parentBatchId: 1 });

// Product level queries
StockSchema.index({ productId: 1, warehouseId: 1 });

// FIXED unique constraint
// Same batch CAN exist in multiple warehouses (transfers)
// Same batch CANNOT exist twice in the same warehouse
StockSchema.index(
  { companyId: 1, batchId: 1, warehouseId: 1 },
  { unique: true }
);

// ---- MIDDLEWARE ----

// Fires on new document creation and .save()
StockSchema.pre("save", function () {
  const now = new Date();
  const entryDate = new Date(this.entryDate);
  const diffTime = Math.abs(now.getTime() - entryDate.getTime());
  this.ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// pre("save") does NOT fire on findByIdAndUpdate
// Use this static method in your cron job instead
StockSchema.statics.updateAgeForAllCompanies = async function () {
  const now = new Date();
  const stocks = await this.find({}).select("_id entryDate");

  const bulkOps = stocks.map((stock: any) => {
    const diffTime = Math.abs(
      now.getTime() - new Date(stock.entryDate).getTime()
    );
    const ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let status = "healthy";
    if (ageInDays >= 180) status = "dead";
    else if (ageInDays >= 120) status = "at_risk";

    return {
      updateOne: {
        filter: { _id: stock._id },
        update: { $set: { ageInDays, status } },
      },
    };
  });

  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }

  return bulkOps.length;
};

export const Stock =
  mongoose.models.Stock || mongoose.model<IStock>("Stock", StockSchema);