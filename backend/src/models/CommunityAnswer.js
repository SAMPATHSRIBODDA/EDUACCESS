import mongoose from "mongoose";

const communityAnswerSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    questionId: { type: Number, required: true, index: true },
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    collegeEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    studentName: { type: String, required: true, trim: true },
    collegeName: { type: String, default: "Independent Student", trim: true },
    content: { type: String, required: true, trim: true },
    explanation: { type: String, default: "", trim: true },
    codeSnippet: { type: String, default: "", trim: true },
    isStepByStep: { type: Boolean, default: false },
    attachmentUrl: { type: String, default: "", trim: true },
    attachmentName: { type: String, default: "", trim: true },
    upvotes: { type: [String], default: [] }, // Array of student emails
    downvotes: { type: [String], default: [] }, // Array of student emails
    isAccepted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CommunityAnswer = mongoose.model("CommunityAnswer", communityAnswerSchema);
