import { Router } from "express";
import { Event } from "../models/Event.js";

const router = Router();

function normalizeCollegeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function nextEventId() {
  const latest = await Event.findOne().sort({ id: -1 }).select("id");
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

    const events = await Event.find(query).sort({ id: 1 }).select("-__v");
    res.json({ data: events, total: events.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { time, name, location, date = new Date().toISOString().slice(0, 10), panel = "college" } = req.body || {};
    const collegeEmail = normalizeCollegeEmail(req.body?.collegeEmail);

    if (!time || !name || !location) {
      return res.status(400).json({ message: "time, name and location are required" });
    }

    const event = await Event.create({
      id: await nextEventId(),
      time,
      name,
      location,
      date,
      panel,
      collegeEmail,
    });

    res.status(201).json({ data: event });
  } catch (error) {
    res.status(500).json({ message: "Failed to create event" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (Number.isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const updates = {};
    const allowedFields = ["time", "name", "location", "date", "panel"];
    allowedFields.forEach((field) => {
      if (req.body?.[field] !== undefined) updates[field] = req.body[field];
    });

    if (req.body?.collegeEmail !== undefined) {
      updates.collegeEmail = normalizeCollegeEmail(req.body.collegeEmail);
    }

    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail || req.body?.collegeEmail);
    const filter = { id: eventId };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const event = await Event.findOneAndUpdate(filter, updates, { new: true }).select("-__v");
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ data: event });
  } catch (error) {
    res.status(500).json({ message: "Failed to update event" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const eventId = Number(req.params.id);
    if (Number.isNaN(eventId)) {
      return res.status(400).json({ message: "Invalid event id" });
    }

    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const filter = { id: eventId };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const deleted = await Event.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ data: { deleted: true, id: eventId } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete event" });
  }
});

export default router;
