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
    companyId: { type: Schema.Types.ObjectId, ref: "SystemConfig", required: true, index: true },
    name: { type: String, required: true },
    warehouseCode: { type: String, required: true, unique: true, index: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String, required: true },
      country: { type: String, required: true, default: "India" },
    },
    manager: { type: Schema.Types.ObjectId, ref: "User", index: true },
    capacity: { type: Number },
    contactPhone: { type: String },
    contactEmail: { type: String },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Warehouse = mongoose.models.Warehouse || mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);
