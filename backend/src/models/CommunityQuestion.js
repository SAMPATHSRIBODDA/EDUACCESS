import mongoose from "mongoose";

const communityQuestionSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    studentName: { type: String, required: true, trim: true },
    collegeName: { type: String, default: "Independent Student", trim: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    codeSnippet: { type: String, default: "", trim: true },
    tags: { type: [String], default: [], index: true },
    upvotes: { type: [String], default: [] }, // Array of student emails
    downvotes: { type: [String], default: [] }, // Array of student emails
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CommunityQuestion = mongoose.model("CommunityQuestion", communityQuestionSchema);
