import mongoose, { Schema, Document } from "mongoose";

export interface IAgingThresholds {
  atRisk: number;
  dead: number;
}

export interface IAlertSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface IXYZSettings {
  xThreshold: number;
  yThreshold: number;
  zThreshold: number;
}

export interface ISystemConfig extends Document {
  _id: mongoose.Types.ObjectId;
  companyName: string;
  industryType: string;
  currency: string;
  concerns: string[];
  agingThresholds: IAgingThresholds;
  alertSettings: IAlertSettings;
  xyzSettings: IXYZSettings;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>(
  {
    companyName: { type: String, required: true },
    industryType: { type: String, required: true },
    currency: { type: String, required: true, default: "USD" },
    concerns: { type: [String], default: [] },
    agingThresholds: {
      atRisk: { type: Number, default: 60 },
      dead: { type: Number, default: 90 },
    },
    alertSettings: {
      emailEnabled: { type: Boolean, default: true },
      smsEnabled: { type: Boolean, default: false },
    },
    xyzSettings: {
      xThreshold: { type: Number, default: 70 },
      yThreshold: { type: Number, default: 20 },
      zThreshold: { type: Number, default: 10 },
    },
  },
  { timestamps: true }
);

export const SystemConfig = mongoose.models.SystemConfig || mongoose.model<ISystemConfig>("SystemConfig", SystemConfigSchema);
