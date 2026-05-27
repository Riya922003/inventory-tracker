import mongoose, { Schema, Document } from "mongoose";

export interface IAddress {
  street?: string;
  city: string;
  state: string;
  pin?: string;
  country: string;
}

export interface IWarehouse extends Document {
  _id: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  name: string;
  warehouseCode: string;
  address: IAddress;
  manager?: mongoose.Types.ObjectId;
  capacity?: number;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "SystemConfig",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    warehouseCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    capacity: {
      type: Number,
      default: 1000,
      min: 1,                // ADDED - capacity cannot be negative or zero
    },
    contactPhone: { type: String, default: "", trim: true },
    contactEmail: { type: String, default: "", trim: true, lowercase: true },
    notes: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ---- INDEXES ----

// REMOVED individual field indexes from schema fields above
// because defining index:true inline AND calling .index() below
// creates duplicate indexes in MongoDB — wasteful and confusing
// All indexes are defined here in one place for clarity

// Most common query - all active warehouses for a company
WarehouseSchema.index({ companyId: 1, isActive: 1 });

// Manager assignment - find warehouses belonging to a manager
WarehouseSchema.index({ manager: 1 });

// ADDED - warehouse name unique per company but only for active warehouses
// partialFilterExpression means:
// if Riya deletes "Bangalore Central" she can create a new one with same name later
// without this, deleted warehouses permanently block that name forever
WarehouseSchema.index(
  { companyId: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

export const Warehouse =
  mongoose.models.Warehouse ||
  mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);