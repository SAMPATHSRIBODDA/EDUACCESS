import mongoose from "mongoose";

const collegeMemberSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    role: {
      type: String,
      required: true,
      enum: ["student", "teacher"],
      index: true,
    },
    name: { type: String, required: true, trim: true },
    regId: { type: String, required: true, trim: true, index: true },
    email: { type: String, default: "", trim: true, lowercase: true, index: true },
    avatar: { type: String, default: "", trim: true },
    phone: { type: String, required: true, trim: true },
    collegeEmail: { type: String, default: "", trim: true, lowercase: true, index: true },
    branch: { type: String, required: true, trim: true, index: true },
    course: { type: String, default: "", trim: true },
    year: { type: String, default: "", trim: true },
    subject: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

collegeMemberSchema.index({ role: 1, regId: 1 }, { unique: true });

export const CollegeMember = mongoose.model("CollegeMember", collegeMemberSchema);
