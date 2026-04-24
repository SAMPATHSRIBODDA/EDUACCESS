import mongoose from "mongoose";

const quizOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
    options: { type: [quizOptionSchema], default: [] },
    correctOptionId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true, index: true },
    teacherEmail: { type: String, default: "teacher@edu.com", trim: true, lowercase: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ["draft", "active", "archived"],
      default: "active",
      index: true,
    },
    questions: { type: [quizQuestionSchema], default: [] },
    openDate: { type: String, default: "", trim: true },
    closeDate: { type: String, default: "", trim: true },
    timeLimit: { type: Number, default: 0 },
    attempts: { type: String, default: "0 Attempts" },
    avgScore: { type: String, default: "0% Avg" },
    collegeEmail: { type: String, default: "", trim: true, lowercase: true, index: true },
  },
  { timestamps: true }
);

export const Quiz = mongoose.model("Quiz", quizSchema);
