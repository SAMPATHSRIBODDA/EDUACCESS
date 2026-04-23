import mongoose from "mongoose";

const quizSubmissionSchema = new mongoose.Schema(
  {
    quizId: { type: Number, required: true, index: true },
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    warningCount: { type: Number, default: 0 },
    timeTakenSeconds: { type: Number, default: 0 },
    attemptNumber: { type: Number, default: 1 },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

quizSubmissionSchema.index({ quizId: 1, studentEmail: 1, submittedAt: -1 });

export const QuizSubmission = mongoose.model("QuizSubmission", quizSubmissionSchema);
