import mongoose, { Schema, Document } from "mongoose";

export interface IProductCategory extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  agingConcern: "slow" | "moderate" | "fast" | "expiry";
  agingDays?: number; // 180, 90, 60, or null for expiry
  isFragile: boolean;
  requiresPhotoVerification: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductCategorySchema = new Schema<IProductCategory>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "SystemConfig", required: true, index: true },
    name: { type: String, required: true, index: true },
    agingConcern: {
      type: String,
      enum: ["slow", "moderate", "fast", "expiry"],
      required: true,
    },
    agingDays: { type: Number },
    isFragile: { type: Boolean, required: true, default: false },
    requiresPhotoVerification: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index to ensure unique category names per company
ProductCategorySchema.index({ companyId: 1, name: 1 }, { unique: true });

export const ProductCategory =
  mongoose.models.ProductCategory ||
  mongoose.model<IProductCategory>("ProductCategory", ProductCategorySchema);
