import mongoose from "mongoose";

const resourceSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    type: {
      type: String,
      required: true,
      enum: ["document", "video", "link", "other"],
      default: "document",
    },
    fileUrl: { type: String, default: "", trim: true },
    linkUrl: { type: String, default: "", trim: true },
    fileName: { type: String, default: "", trim: true },
    fileSize: { type: String, default: "", trim: true },
    extractedText: { type: String, default: "" },
    course: { type: String, required: true, trim: true, index: true }, // Can be "All" or specific course title
    teacherEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    collegeEmail: { type: String, default: "", trim: true, lowercase: true, index: true },
  },
  { timestamps: true }
);

export const Resource = mongoose.model("Resource", resourceSchema);
