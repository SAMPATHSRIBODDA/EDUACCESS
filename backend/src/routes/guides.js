import { Router } from "express";
import mongoose from "mongoose";
import { Guide } from "../models/Guide.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const guides = await Guide.find(query).sort({ id: 1 }).select("-__v");

    return res.json({ data: guides, total: guides.length });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch guides" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const numericId = Number(param);

    const query = Number.isNaN(numericId)
      ? mongoose.Types.ObjectId.isValid(param)
        ? { _id: param }
        : null
      : { id: numericId };

    if (!query) {
      return res.status(400).json({ message: "Invalid guide id" });
    }

    const guide = await Guide.findOne(query).select("-__v");

    if (!guide) {
      return res.status(404).json({ message: "Guide not found" });
    }

    res.json({ data: guide });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch guide" });
  }
});

export default router;
