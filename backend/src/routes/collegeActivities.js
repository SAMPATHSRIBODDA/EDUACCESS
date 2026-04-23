import { Router } from "express";
import { CollegeActivity } from "../models/CollegeActivity.js";

const router = Router();

function normalizeCollegeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function nextActivityId() {
  const latest = await CollegeActivity.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

router.get("/", async (req, res) => {
  try {
    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const query = collegeEmail ? { collegeEmail } : {};
    const activities = await CollegeActivity.find(query).sort({ id: 1 }).select("-__v");
    res.json({ data: activities, total: activities.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch college activities" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, message, time } = req.body || {};
    const collegeEmail = normalizeCollegeEmail(req.body?.collegeEmail);
    if (!type || !message || !time) {
      return res.status(400).json({ message: "type, message and time are required" });
    }

    const activity = await CollegeActivity.create({
      id: await nextActivityId(),
      type,
      message,
      time,
      collegeEmail,
    });

    res.status(201).json({ data: activity });
  } catch (error) {
    res.status(500).json({ message: "Failed to create college activity" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const activityId = Number(req.params.id);
    if (Number.isNaN(activityId)) {
      return res.status(400).json({ message: "Invalid activity id" });
    }

    const updates = {};
    const allowedFields = ["type", "message", "time"];
    allowedFields.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.body?.collegeEmail !== undefined) {
      updates.collegeEmail = normalizeCollegeEmail(req.body.collegeEmail);
    }

    const activity = await CollegeActivity.findOneAndUpdate({ id: activityId }, updates, { new: true }).select("-__v");
    if (!activity) {
      return res.status(404).json({ message: "College activity not found" });
    }

    res.json({ data: activity });
  } catch (error) {
    res.status(500).json({ message: "Failed to update college activity" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const activityId = Number(req.params.id);
    if (Number.isNaN(activityId)) {
      return res.status(400).json({ message: "Invalid activity id" });
    }

    const deleted = await CollegeActivity.findOneAndDelete({ id: activityId });
    if (!deleted) {
      return res.status(404).json({ message: "College activity not found" });
    }

    res.json({ data: { deleted: true, id: activityId } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete college activity" });
  }
});

export default router;
