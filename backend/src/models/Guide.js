import mongoose from "mongoose";

const stepSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    code: { type: String, default: "" },
  },
  { _id: false }
);

const mediaSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const guideSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    difficulty: { type: String, required: true, trim: true },
    status: { type: String, required: true, trim: true, index: true },
    rating: { type: Number, required: true, min: 0, max: 5 },
    description: { type: String, required: true, trim: true },
    steps: { type: [stepSchema], default: [] },
    media: { type: [mediaSchema], default: [] },
  },
  { timestamps: true }
);

export const Guide = mongoose.model("Guide", guideSchema);
