import mongoose from "mongoose";

const collegeActivitySchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    type: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    collegeEmail: { type: String, default: "", trim: true, lowercase: true, index: true },
  },
  { timestamps: true }
);

export const CollegeActivity = mongoose.model("CollegeActivity", collegeActivitySchema);
