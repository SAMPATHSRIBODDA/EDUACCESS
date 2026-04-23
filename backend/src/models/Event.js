import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    time: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    date: { type: String, default: "", trim: true },
    panel: {
      type: String,
      required: true,
      enum: ["student", "teacher", "college", "superadmin"],
      index: true,
    },
    collegeEmail: { type: String, default: "", trim: true, lowercase: true, index: true },
  },
  { timestamps: true }
);

export const Event = mongoose.model("Event", eventSchema);
