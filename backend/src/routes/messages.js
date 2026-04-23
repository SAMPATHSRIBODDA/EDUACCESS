import { Router } from "express";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { Course } from "../models/Course.js";
import { CourseEnrollment } from "../models/CourseEnrollment.js";

const router = Router();

async function nextMessageId() {
  const latest = await Message.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

// Get list of contacts (students for teachers, teachers for students)
router.get("/contacts", async (req, res) => {
  try {
    const { email, role } = req.query;

    if (!email || !role) {
      return res.status(400).json({ message: "email and role are required" });
    }

    let contactEmails = [];

    if (role === "teacher") {
      // Find all courses created by this teacher
      const courses = await Course.find({ createdBy: email }).select("id");
      const courseIds = courses.map((c) => c.id);

      // Find all students enrolled in these courses
      const enrollments = await CourseEnrollment.find({ courseId: { $in: courseIds } }).select("studentEmail");
      contactEmails = [...new Set(enrollments.map((e) => e.studentEmail))];
    } else if (role === "student") {
      // Find all courses this student is enrolled in
      const enrollments = await CourseEnrollment.find({ studentEmail: email }).select("courseId");
      const courseIds = enrollments.map((e) => e.courseId);

      // Find the teachers who created these courses
      const courses = await Course.find({ id: { $in: courseIds } }).select("createdBy");
      contactEmails = [...new Set(courses.map((c) => c.createdBy))];
    } else {
      return res.status(400).json({ message: "Invalid role for contacts" });
    }

    // Fetch user details for these emails
    const contacts = await User.find({ email: { $in: contactEmails } }).select("name email avatar role");

    res.json({ data: contacts });
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

// Get chat history between two users
router.get("/history/:otherEmail", async (req, res) => {
  try {
    const { myEmail } = req.query;
    const { otherEmail } = req.params;

    if (!myEmail || !otherEmail) {
      return res.status(400).json({ message: "myEmail and otherEmail are required" });
    }

    const messages = await Message.find({
      $or: [
        { from: myEmail, to: otherEmail },
        { from: otherEmail, to: myEmail },
      ],
    }).sort({ createdAt: 1 }).select("-__v");

    res.json({ data: messages });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chat history" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { panel, from, to } = req.query;
    const query = {};

    if (panel) query.panel = panel;
    if (from) query.from = from;
    if (to) query.to = to;

    const messages = await Message.find(query).sort({ id: 1 }).select("-__v");
    res.json({ data: messages, total: messages.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { from, to, body, time, status = "sent", panel = "teacher" } = req.body || {};

    if (!from || !to || !body || !time) {
      return res.status(400).json({ message: "from, to, body and time are required" });
    }

    const message = await Message.create({
      id: await nextMessageId(),
      from,
      to,
      body,
      time,
      status,
      panel,
    });

    res.status(201).json({ data: message });
  } catch (error) {
    res.status(500).json({ message: "Failed to create message" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    if (Number.isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const updates = {};
    const allowedFields = ["from", "to", "body", "time", "status", "panel"];

    allowedFields.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const message = await Message.findOneAndUpdate({ id: messageId }, updates, { new: true }).select("-__v");

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ data: message });
  } catch (error) {
    res.status(500).json({ message: "Failed to update message" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const messageId = Number(req.params.id);
    if (Number.isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message id" });
    }

    const deleted = await Message.findOneAndDelete({ id: messageId });
    if (!deleted) {
      return res.status(404).json({ message: "Message not found" });
    }

    res.json({ data: { deleted: true, id: messageId } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete message" });
  }
});

export default router;
