import mongoose from "mongoose";

const courseProgressSchema = new mongoose.Schema(
  {
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    courseId: { type: Number, required: true, index: true },
    completedLectureIds: { type: [String], default: [] },
    completedModuleIds: { type: [String], default: [] },
    testScores: {
      type: [
        {
          lectureId: { type: String, default: "", trim: true },
          testId: { type: String, default: "", trim: true },
          score: { type: Number, default: 0 },
          total: { type: Number, default: 0 },
          submittedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    topicDurations: {
      type: [
        {
          lectureId: { type: String, default: "", trim: true },
          secondsSpent: { type: Number, default: 0 },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

courseProgressSchema.index({ studentEmail: 1, courseId: 1 }, { unique: true });

export const CourseProgress = mongoose.model("CourseProgress", courseProgressSchema);
