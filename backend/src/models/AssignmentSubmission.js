import mongoose from "mongoose";

const assignmentEvaluationDetailSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    questionType: { type: String, enum: ["mcq", "code"], required: true },
    passed: { type: Boolean, default: false },
    language: { type: String, default: "", trim: true },
    message: { type: String, default: "", trim: true },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 1 },
  },
  { _id: false }
);

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignmentId: { type: Number, required: true, index: true },
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    mcqAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
    codeAnswers: { type: mongoose.Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    warningCount: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    attemptNumber: { type: Number, default: 1 },
    details: { type: [assignmentEvaluationDetailSchema], default: [] },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index({ assignmentId: 1, studentEmail: 1, submittedAt: -1 });

export const AssignmentSubmission = mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);
