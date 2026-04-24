import { Router } from "express";
import { Announcement } from "../models/Announcement.js";

const router = Router();

function normalizeCollegeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function nextAnnouncementId() {
  const latest = await Announcement.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

router.get("/", async (req, res) => {
  try {
    const { panel } = req.query;
    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const query = panel ? { panel } : {};

    if (collegeEmail) {
      query.collegeEmail = collegeEmail;
    }

    const announcements = await Announcement.find(query).sort({ id: 1 }).select("-__v");
    res.json({ data: announcements, total: announcements.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description, date, tag = "General", panel = "college" } = req.body || {};
    const collegeEmail = normalizeCollegeEmail(req.body?.collegeEmail);

    if (!title || !description || !date) {
      return res.status(400).json({ message: "title, description and date are required" });
    }

    const announcement = await Announcement.create({
      id: await nextAnnouncementId(),
      title,
      description,
      date,
      tag,
      panel,
      collegeEmail,
    });

    res.status(201).json({ data: announcement });
  } catch (error) {
    res.status(500).json({ message: "Failed to create announcement" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const announcementId = Number(req.params.id);
    if (Number.isNaN(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const updates = {};
    const allowedFields = ["title", "description", "date", "tag", "panel"];
    allowedFields.forEach((field) => {
      if (req.body?.[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body?.collegeEmail !== undefined) {
      updates.collegeEmail = normalizeCollegeEmail(req.body.collegeEmail);
    }

    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail || req.body?.collegeEmail);
    const filter = { id: announcementId };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const announcement = await Announcement.findOneAndUpdate(filter, updates, { new: true }).select("-__v");
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json({ data: announcement });
  } catch (error) {
    res.status(500).json({ message: "Failed to update announcement" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const announcementId = Number(req.params.id);
    if (Number.isNaN(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement id" });
    }

    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const filter = { id: announcementId };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const deleted = await Announcement.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.json({ data: { deleted: true, id: announcementId } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete announcement" });
  }
});

export default router;
