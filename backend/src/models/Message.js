import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    from: { type: String, required: true, trim: true, index: true },
    to: { type: String, required: true, trim: true, index: true },
    body: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
    panel: {
      type: String,
      required: true,
      enum: ["teacher", "student", "college", "superadmin"],
      index: true,
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
