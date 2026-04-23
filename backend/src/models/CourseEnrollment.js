import mongoose from "mongoose";

const courseEnrollmentSchema = new mongoose.Schema(
  {
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    courseId: { type: Number, required: true, index: true },
    paymentStatus: { type: String, enum: ["free", "paid"], default: "free" },
    amountPaid: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    paymentOrderId: { type: String, default: "" },
    paymentId: { type: String, default: "" },
    paymentSignature: { type: String, default: "" },
    enrolledAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

courseEnrollmentSchema.index({ studentEmail: 1, courseId: 1 }, { unique: true });

export const CourseEnrollment = mongoose.model("CourseEnrollment", courseEnrollmentSchema);
