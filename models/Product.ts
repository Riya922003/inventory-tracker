import mongoose, { Schema, Document } from "mongoose";

export interface IProduct extends Document {
  companyId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  category: mongoose.Types.ObjectId;
  subCategory?: string;
  unitPrice: number;
  unitType: "piece" | "kilogram" | "liter" | "box" | "meter";
  isFragile: boolean;
  hasExpiryDate: boolean;
  reorderLevel: number;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "SystemConfig", required: true, index: true },
    sku: { type: String, required: true },
    name: { type: String, required: true, index: "text" },
    category: { type: Schema.Types.ObjectId, ref: "ProductCategory", required: true },
    subCategory: { type: String },
    unitPrice: { type: Number, required: true },
    unitType: { 
      type: String, 
      enum: ["piece", "kilogram", "liter", "box", "meter"], 
      required: true,
      default: "piece"
    },
    isFragile: { type: Boolean, default: false },
    hasExpiryDate: { type: Boolean, default: false },
    reorderLevel: { type: Number, required: true, default: 10 },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index: SKU must be unique within each company
ProductSchema.index({ companyId: 1, sku: 1 }, { unique: true });

export const Product = mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
