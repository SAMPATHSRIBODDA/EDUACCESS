import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    tag: { type: String, default: "General", trim: true },
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

export const Announcement = mongoose.model("Announcement", announcementSchema);
