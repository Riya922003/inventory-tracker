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
  address: IAddress;
  manager?: mongoose.Types.ObjectId;
  capacity?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseSchema = new Schema<IWarehouse>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "SystemConfig", required: true },
    name: { type: String, required: true },
    address: {
      street: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pin: { type: String },
      country: { type: String, required: true, default: "India" },
    },
    manager: { type: Schema.Types.ObjectId, ref: "User" },
    capacity: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WarehouseSchema.index({ companyId: 1 });
WarehouseSchema.index({ manager: 1 });

export const Warehouse = mongoose.models.Warehouse || mongoose.model<IWarehouse>("Warehouse", WarehouseSchema);
