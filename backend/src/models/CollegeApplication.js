import mongoose from "mongoose";

const collegeApplicationSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    collegeName: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    ownerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    website: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    affiliation: { type: String, default: "", trim: true },
    programs: { type: String, default: "", trim: true },
    students: { type: Number, default: 0 },
    facilities: { type: String, default: "", trim: true },
    summary: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    submittedAt: { type: String, required: true },
    reviewedAt: { type: String, default: "" },
  },
  { timestamps: true }
);

collegeApplicationSchema.index({ status: 1, submittedAt: -1 });

export const CollegeApplication = mongoose.model("CollegeApplication", collegeApplicationSchema);