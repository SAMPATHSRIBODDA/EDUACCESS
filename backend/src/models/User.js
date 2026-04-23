import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    role: {
      type: String,
      required: true,
      enum: ["student", "teacher", "college", "admin"],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "suspended", "banned"],
      default: "active",
      index: true,
    },
    avatar: { type: String, required: true, trim: true },
    regId: { type: String, default: "", index: true },
    branch: { 
      type: String, 
      default: "", 
      enum: ["", "CSE", "ECE", "EEE", "MECH", "CIVIL"],
      index: true 
    },
    phoneNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
