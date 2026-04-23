import mongoose from "mongoose";

const mcqOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true, trim: true },
    expectedOutput: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const mcqQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
    options: { type: [mcqOptionSchema], default: [] },
    correctOptionId: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const codeQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    prompt: { type: String, default: "", trim: true },
    codeStarter: { type: String, default: "", trim: true },
    language: { type: String, default: "js", trim: true },
    testCases: { type: [testCaseSchema], default: [] },
  },
  { _id: false }
);

const assignmentSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    sectionType: { type: String, enum: ["mcq", "code"], required: true },
    mcqQuestions: { type: [mcqQuestionSchema], default: [] },
    codeQuestions: { type: [codeQuestionSchema], default: [] },
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    due: { type: String, required: true, trim: true },
    openDate: { type: String, default: "", trim: true },
    closeDate: { type: String, default: "", trim: true },
    submissions: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ["Pending", "In Review", "Graded"],
      index: true,
    },
    assignmentType: {
      type: String,
      required: true,
      enum: ["mcq", "code", "mixed"],
      default: "mixed",
      index: true,
    },
    language: {
      type: String,
      default: "js",
      trim: true,
      index: true,
    },
    timeLimit: { type: Number, default: 0 },
    sections: { type: [assignmentSectionSchema], default: [] },
    questions: { type: [mcqQuestionSchema], default: [] },
    codeQuestions: { type: [codeQuestionSchema], default: [] },
    mcqQuestion: { type: String, default: "", trim: true },
    options: { type: [mcqOptionSchema], default: [] },
    correctOptionId: { type: String, default: "", trim: true },
    prompt: { type: String, default: "", trim: true },
    codeStarter: { type: String, default: "", trim: true },
    testCases: { type: [testCaseSchema], default: [] },
    assignmentFileUrl: { type: String, default: "", trim: true },
    assignmentFileName: { type: String, default: "", trim: true },
    assignmentFileSize: { type: String, default: "", trim: true },
    teacherEmail: { type: String, default: "teacher@edu.com", trim: true, lowercase: true, index: true },
  },
  { timestamps: true }
);

export const Assignment = mongoose.model("Assignment", assignmentSchema);
