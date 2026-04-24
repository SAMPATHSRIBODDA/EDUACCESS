import { Router } from "express";
import { Course } from "../models/Course.js";
import { Event } from "../models/Event.js";
import { CollegeMember } from "../models/CollegeMember.js";
import { CollegeActivity } from "../models/CollegeActivity.js";
import { Announcement } from "../models/Announcement.js";
import { CollegeSetting } from "../models/CollegeSetting.js";
import { CollegeApplication } from "../models/CollegeApplication.js";

const router = Router();

function normalizeCollegeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

const defaultSettings = {
  roleBasedAccess: true,
  twoFactorAuth: true,
  autoBackup: false,
  emailAlerts: true,
  examReminders: true,
  financeDigest: false,
  lastBackupAt: "",
};

router.get("/settings", async (req, res) => {
  try {
    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const filter = { panel: "college" };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const saved = await CollegeSetting.findOne(filter).select("-__v");

    if (!saved) {
      return res.json({ data: { ...defaultSettings, collegeEmail } });
    }

    res.json({
      data: {
        roleBasedAccess: Boolean(saved.roleBasedAccess),
        twoFactorAuth: Boolean(saved.twoFactorAuth),
        autoBackup: Boolean(saved.autoBackup),
        emailAlerts: Boolean(saved.emailAlerts),
        examReminders: Boolean(saved.examReminders),
        financeDigest: Boolean(saved.financeDigest),
        lastBackupAt: String(saved.lastBackupAt || ""),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch college panel settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const payload = req.body || {};
    const collegeEmail = normalizeCollegeEmail(payload.collegeEmail || req.query?.collegeEmail);

    if (!collegeEmail) {
      return res.status(400).json({ message: "collegeEmail is required to save settings" });
    }

    const updates = {
      roleBasedAccess: Boolean(payload.roleBasedAccess),
      twoFactorAuth: Boolean(payload.twoFactorAuth),
      autoBackup: Boolean(payload.autoBackup),
      emailAlerts: Boolean(payload.emailAlerts),
      examReminders: Boolean(payload.examReminders),
      financeDigest: Boolean(payload.financeDigest),
      lastBackupAt: typeof payload.lastBackupAt === "string" ? payload.lastBackupAt : "",
    };

    const saved = await CollegeSetting.findOneAndUpdate(
      { panel: "college", collegeEmail },
      { panel: "college", collegeEmail, ...updates },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).select("-__v");

    res.json({
      data: {
        roleBasedAccess: Boolean(saved.roleBasedAccess),
        twoFactorAuth: Boolean(saved.twoFactorAuth),
        autoBackup: Boolean(saved.autoBackup),
        emailAlerts: Boolean(saved.emailAlerts),
        examReminders: Boolean(saved.examReminders),
        financeDigest: Boolean(saved.financeDigest),
        lastBackupAt: String(saved.lastBackupAt || ""),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update college panel settings" });
  }
});

router.get("/overview", async (req, res) => {
  try {
    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const memberFilter = collegeEmail ? { collegeEmail } : {};
    const courseFilter = collegeEmail ? { collegeEmail } : {};
    const activityFilter = collegeEmail ? { collegeEmail } : {};
    const announcementFilter = collegeEmail ? { panel: "college", collegeEmail } : { panel: "college" };
    const eventFilter = collegeEmail ? { panel: "college", collegeEmail } : { panel: "college" };

    const [
      studentsCount,
      teachersCount,
      pendingCourses,
      approvedCourses,
      recentActivities,
      recentAnnouncements,
      recentEvents,
      departments,
      departmentStats
    ] = await Promise.all([
      CollegeMember.countDocuments({ ...memberFilter, role: "student" }),
      CollegeMember.countDocuments({ ...memberFilter, role: "teacher" }),
      Course.countDocuments({ ...courseFilter, status: "pending" }),
      Course.countDocuments({ ...courseFilter, status: "approved" }),
      CollegeActivity.find(activityFilter).sort({ createdAt: -1 }).limit(10).select("-__v"),
      Announcement.find(announcementFilter).sort({ createdAt: -1, id: -1 }).limit(5).select("-__v"),
      Event.find(eventFilter).sort({ date: 1, id: 1 }).limit(5).select("-__v"),
      CollegeMember.distinct("branch", { ...memberFilter, branch: { $ne: "" } }),
      CollegeMember.aggregate([
        { $match: { ...memberFilter, role: "student" } },
        {
          $group: {
            _id: { $ifNull: ["$branch", "Unassigned"] },
            students: { $sum: 1 }
          }
        },
        { $sort: { students: -1, _id: 1 } }
      ]),
      CollegeMember.aggregate([
        { $match: { ...memberFilter, role: "teacher" } },
        { $group: { _id: "$branch", teachers: { $push: "$name" } } }
      ])
    ]);

    const teacherMap = new Map();
    teacherAgg.forEach((item) => {
      teacherMap.set(item._id, Array.isArray(item.teachers) && item.teachers.length > 0 ? item.teachers[0] : "TBD");
    });

    const metrics = {
      totalStudents: studentsCount,
      totalTeachers: teachersCount,
      pendingCourses,
      approvedCourses,
      totalDepartments: departments.length,
      activityCount: recentActivities.length
    };

    const quickStats = [
      {
        label: "Announcements",
        value: recentAnnouncements.length,
        note: recentAnnouncements[0] ? `Latest: ${recentAnnouncements[0].title}` : "No announcements published yet"
      },
      {
        label: "Recent Activities",
        value: recentActivities.length,
        note: recentActivities[0] ? `Latest: ${recentActivities[0].type}` : "No activity recorded yet"
      },
      {
        label: "Upcoming Events",
        value: recentEvents.length,
        note: recentEvents[0] ? `Next: ${recentEvents[0].name}` : "No events scheduled"
      },
      {
        label: "Pending Courses",
        value: pendingCourses,
        note: pendingCourses > 0 ? "Awaiting review" : "All courses approved"
      }
    ];

    const tasks = [];

    if (pendingCourses > 0) {
      tasks.push({
        title: `Review ${pendingCourses} pending course${pendingCourses === 1 ? "" : "s"}`,
        note: "Course approvals need attention",
        tone: "warning"
      });
    }

    if (recentAnnouncements.length > 0) {
      tasks.push({
        title: `Track ${recentAnnouncements.length} live announcement${recentAnnouncements.length === 1 ? "" : "s"}`,
        note: `Latest post: ${recentAnnouncements[0].title}`,
        tone: "info"
      });
    }

    if (recentActivities.length > 0) {
      tasks.push({
        title: `Monitor ${recentActivities.length} recent activit${recentActivities.length === 1 ? "y" : "ies"}`,
        note: `Latest update: ${recentActivities[0].type}`,
        tone: "success"
      });
    }

    if (recentEvents.length > 0) {
      tasks.push({
        title: `Prepare for ${recentEvents.length} scheduled event${recentEvents.length === 1 ? "" : "s"}`,
        note: `Next event: ${recentEvents[0].name}`,
        tone: "neutral"
      });
    }

    const college = collegeEmail ? await CollegeApplication.findOne({ ownerEmail: collegeEmail }).select("collegeName ownerName ownerEmail city status") : null;

    res.json({
      data: {
        metrics,
        college,
        activities: recentActivities,
        announcements: recentAnnouncements,
        events: recentEvents,
        quickStats,
        tasks,
        departmentsList: departments,
        departmentStats: departmentStats.map((item) => ({
          branch: item._id,
          students: item.students,
          head: teacherMap.get(item._id) || "TBD"
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch college panel overview" });
  }
});

export default router;
