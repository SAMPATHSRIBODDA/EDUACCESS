import mongoose from "mongoose";

const collegeSettingSchema = new mongoose.Schema(
  {
    panel: {
      type: String,
      required: true,
      unique: true,
      enum: ["college"],
      default: "college",
      index: true,
    },
    roleBasedAccess: { type: Boolean, default: true },
    twoFactorAuth: { type: Boolean, default: true },
    autoBackup: { type: Boolean, default: false },
    emailAlerts: { type: Boolean, default: true },
    examReminders: { type: Boolean, default: true },
    financeDigest: { type: Boolean, default: false },
    lastBackupAt: { type: String, default: "" },
  },
  { timestamps: true }
);

export const CollegeSetting = mongoose.model("CollegeSetting", collegeSettingSchema);
