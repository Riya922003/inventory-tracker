import mongoose, { Schema, Document } from "mongoose";

export interface IInvitation extends Document {
  email: string;
  role: "super_admin" | "warehouse_manager";
  assignedWarehouses: mongoose.Types.ObjectId[]; // Array of warehouse IDs
  
  // Invitation details
  token: string;
  invitedBy: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  
  // Status
  status: "pending" | "accepted" | "expired";
  sentAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  
  // Message
  personalMessage?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>(
  {
    email: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["super_admin", "warehouse_manager"],
      required: true,
    },
    assignedWarehouses: [{ type: Schema.Types.ObjectId, ref: "Warehouse" }], // Array of warehouse IDs
    
    // Invitation details
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "SystemConfig", required: true },
    
    // Status
    status: {
      type: String,
      enum: ["pending", "accepted", "expired"],
      default: "pending",
    },
    sentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    
    // Message
    personalMessage: { type: String },
  },
  { timestamps: true }
);

// Index for finding pending invitations by email
InvitationSchema.index({ email: 1, status: 1 });

// Index for cleaning up expired invitations
InvitationSchema.index({ expiresAt: 1, status: 1 });

export const Invitation =
  mongoose.models.Invitation ||
  mongoose.model<IInvitation>("Invitation", InvitationSchema);
