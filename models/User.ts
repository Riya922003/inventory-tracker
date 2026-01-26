import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "super_admin" | "warehouse_manager";
  phone?: string;
  companyId?: mongoose.Types.ObjectId;
  assignedWarehouses: mongoose.Types.ObjectId[]; // Array of warehouse IDs
  
  // Audit - who invited this user
  invitedBy?: mongoose.Types.ObjectId;
  
  // Status
  status: "active" | "inactive" | "pending";
  isActive: boolean;
  emailVerified: boolean;
  invitationToken?: string;
  invitationExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  
  // Preferences
  preferences: {
    emailNotifications: boolean;
    dailyDigest: boolean;
    criticalAlertsOnly: boolean;
  };
  
  // Audit
  lastLogin?: Date;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "warehouse_manager"],
      required: true,
    },
    phone: { type: String },
    companyId: { type: Schema.Types.ObjectId, ref: "SystemConfig" },
    assignedWarehouses: [{ type: Schema.Types.ObjectId, ref: "Warehouse" }], // Array of warehouse IDs
    
    // Audit - who invited this user
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    invitationToken: { type: String },
    invitationExpiry: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    
    // Preferences
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: true },
      criticalAlertsOnly: { type: Boolean, default: false },
    },
    
    // Audit
    lastLogin: { type: Date },
    lastActive: { type: Date },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
