import mongoose from "mongoose";

const testSubmissionSchema = new mongoose.Schema(
  {
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    courseId: { type: Number, required: true, index: true },
    lectureId: { type: String, required: true, trim: true, index: true },
    testId: { type: String, required: true, trim: true, index: true },
    testType: { type: String, enum: ["mcq", "code"], required: true },
    language: { type: String, default: "js", trim: true },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    code: { type: String, default: "" },
    warningCount: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    result: {
      score: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      passed: { type: Boolean, default: false },
      details: { type: mongoose.Schema.Types.Mixed, default: [] },
    },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

testSubmissionSchema.index({ studentEmail: 1, courseId: 1, lectureId: 1, testId: 1, submittedAt: -1 });

export const TestSubmission = mongoose.model("TestSubmission", testSubmissionSchema);
