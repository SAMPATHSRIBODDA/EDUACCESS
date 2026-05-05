import mongoose from "mongoose";

const mcqOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const codeTestCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true, trim: true },
    expectedOutput: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const lectureTestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ["mcq", "code"],
    },
    mcqQuestion: { type: String, default: "", trim: true },
    options: { type: [mcqOptionSchema], default: [] },
    correctOptionId: { type: String, default: "", trim: true },
    prompt: { type: String, default: "", trim: true },
    functionName: { type: String, default: "", trim: true },
    testCases: { type: [codeTestCaseSchema], default: [] },
    language: { type: String, default: 'js', trim: true },
  },
  { _id: false }
);

const lectureModuleSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    pdfUrl: { type: String, default: "", trim: true },
    pptUrl: { type: String, default: "", trim: true },
    videoUrl: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const lectureSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: "", trim: true },
    testTimeMinutes: { type: Number, default: 30, min: 1, max: 600 },
    documentUrl: { type: String, default: "", trim: true },
    documentName: { type: String, default: "", trim: true },
    extractedText: { type: String, default: "", trim: true },
    modules: { type: [lectureModuleSchema], default: [] },
    tests: { type: [lectureTestSchema], default: [] },
  },
  { _id: false }
);

const unitSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    lectures: { type: [lectureSchema], default: [] },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    difficulty: {
      type: String,
      required: true,
      enum: ["Beginner", "Intermediate", "Advanced"],
      index: true,
    },
    rating: { type: Number, required: true, min: 0, max: 5 },
    reviews: { type: String, default: "0" },
    price: { type: String, default: "Free" },
    image: { type: String, default: "" },
    badge: { type: String, default: "" },
    accessibilityTags: { type: [String], default: [] },
    topic: { type: String, default: "" },
    grade: { type: String, default: "" },
    students: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    icon: { type: String, default: "" },
    collegeEmail: { type: String, default: "", trim: true, lowercase: true, index: true },
    panels: { type: [String], default: ["student"], index: true },
    units: { type: [unitSchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    createdBy: { type: String, default: "", index: true },
  },
  { timestamps: true }
);

export const Course = mongoose.model("Course", courseSchema);
