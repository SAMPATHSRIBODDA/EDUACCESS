import { Router } from "express";
import { CollegeMember } from "../models/CollegeMember.js";

const router = Router();

function normalizeCollegeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function nextMemberId() {
  const latest = await CollegeMember.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

router.get("/", async (req, res) => {
  try {
    const { role } = req.query;
    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const query = {};

    if (role && ["student", "teacher"].includes(String(role))) {
      query.role = String(role);
    }

    if (collegeEmail) {
      query.collegeEmail = collegeEmail;
    }

    const members = await CollegeMember.find(query).sort({ id: 1 }).select("-__v");
    const normalized = members.map((member) => {
      const item = member.toObject();
      return { ...item, status: item.status || "active" };
    });

    res.json({ data: normalized, total: normalized.length });
  } catch {
    res.status(500).json({ message: "Failed to fetch college members" });
  }
});

router.get("/lookup", async (req, res) => {
  try {
    const email = String(req.query?.email || "").trim().toLowerCase();
    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);

    if (!email) {
      return res.status(400).json({ message: "email query is required" });
    }

    const filter = { email };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const member = await CollegeMember.findOne(filter).select("-__v");

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json({ data: member });
  } catch {
    res.status(500).json({ message: "Failed to lookup member" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const member = await CollegeMember.findOne({ id: Number(id) }).select("-__v");

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json({ data: member });
  } catch {
    res.status(500).json({ message: "Failed to fetch member" });
  }
});

router.post("/bulk", async (req, res) => {
  try {
    const { role, records } = req.body || {};
    const collegeEmail = normalizeCollegeEmail(req.body?.collegeEmail);

    if (!["student", "teacher"].includes(role)) {
      return res.status(400).json({ message: "role must be student or teacher" });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "records array is required" });
    }

    const validRecords = records
      .map((record) => ({
        role,
        name: String(record?.name || "").trim(),
        regId: String(record?.regId || "").trim(),
        email: String(record?.email || "").trim().toLowerCase(),
        phone: String(record?.phone || "").trim(),
        collegeEmail: normalizeCollegeEmail(record?.collegeEmail || collegeEmail),
        branch: String(record?.branch || "").trim(),
        course: role === "student" ? String(record?.course || "").trim() : "",
        year: role === "student" ? String(record?.year || "").trim() : "",
        subject: role === "teacher" ? String(record?.subject || "").trim() : "",
        status: "active",
      }))
      .filter((record) => {
        if (role === "student") {
          return record.name && record.regId && record.email && record.phone && record.branch && record.course && record.year;
        }

        return record.name && record.regId && record.email && record.phone && record.branch && record.subject;
      });

    if (validRecords.length === 0) {
      return res.status(400).json({ message: "No valid rows found in payload" });
    }

    let counter = await nextMemberId();
    const ops = validRecords.map((record) => {
      const currentId = counter;
      counter += 1;

      return {
        updateOne: {
          filter: { role: record.role, regId: record.regId, collegeEmail: record.collegeEmail },
          update: { $set: record, $setOnInsert: { id: currentId } },
          upsert: true,
        },
      };
    });

    await CollegeMember.bulkWrite(ops, { ordered: false });

    const saved = await CollegeMember.find({ role }).sort({ id: 1 }).select("-__v");
    res.status(201).json({ data: saved, imported: validRecords.length });
  } catch {
    res.status(500).json({ message: "Failed to import bulk records" });
  }
});

router.get("/department-stats", async (req, res) => {
  try {
    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const filter = collegeEmail ? { collegeEmail } : {};

    // Get all unique branches from both students and teachers
    const branches = await CollegeMember.distinct("branch", filter);

    const [studentAgg, teacherAgg] = await Promise.all([
      CollegeMember.aggregate([
        { $match: { ...filter, role: "student" } },
        { $group: { _id: "$branch", students: { $sum: 1 } } },
      ]),
      CollegeMember.aggregate([
        { $match: { ...filter, role: "teacher" } },
        { $group: { _id: "$branch", head: { $first: "$name" } } },
      ]),
    ]);

    const studentMap = new Map();
    studentAgg.forEach((item) => studentMap.set(item._id, item.students));

    const teacherMap = new Map();
    teacherAgg.forEach((item) => teacherMap.set(item._id, item.head));

    const departments = branches
      .filter(Boolean)
      .map((branch) => ({
        branch,
        students: studentMap.get(branch) || 0,
        head: teacherMap.get(branch) || "TBD",
      }))
      .sort((a, b) => b.students - a.students || a.branch.localeCompare(b.branch));

    res.json({ data: departments, total: departments.length });
  } catch (error) {
    console.error("Department stats error:", error);
    res.status(500).json({ message: "Failed to fetch department stats" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove immutable fields if present
    delete updateData.id;
    delete updateData._id;
    delete updateData.role;

    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail || updateData.collegeEmail);
    const filter = { id: Number(id) };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const updated = await CollegeMember.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true }
    ).select("-__v");

    if (!updated) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json({ data: updated });
  } catch {
    res.status(500).json({ message: "Failed to update member" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const filter = { id: Number(id) };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const deleted = await CollegeMember.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json({ data: { deleted: true, id: Number(id) } });
  } catch {
    res.status(500).json({ message: "Failed to delete member" });
  }
});

export default router;
