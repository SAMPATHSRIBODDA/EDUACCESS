import { Router } from "express";
import mongoose from "mongoose";
import { Announcement } from "../models/Announcement.js";
import { CollegeApplication } from "../models/CollegeApplication.js";
import { CollegeMember } from "../models/CollegeMember.js";
import { Course } from "../models/Course.js";
import { Event } from "../models/Event.js";
import { Guide } from "../models/Guide.js";
import { User } from "../models/User.js";

const router = Router();

function toTitleCase(value) {
  if (!value) return "";
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

function resolveUserQuery(param) {
  const numericId = Number(param);

  if (!Number.isNaN(numericId)) {
    return { id: numericId };
  }

  if (mongoose.Types.ObjectId.isValid(param)) {
    return { _id: param };
  }

  return null;
}

async function nextAnnouncementId() {
  const latest = await Announcement.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

async function nextUserId() {
  const latest = await User.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

async function nextCollegeApplicationId() {
  const latest = await CollegeApplication.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function buildUniqueList(items, keyResolver) {
  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    const key = normalizeKey(keyResolver(item));
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(item);
  });

  return result;
}

async function resolvePrimaryCollegeContext() {
  const [collegeUser, approvedApplication] = await Promise.all([
    User.findOne({ role: "college", status: "active" }).sort({ id: 1 }).select("-__v"),
    CollegeApplication.findOne({ status: "approved" }).sort({ reviewedAt: -1, id: -1 }).select("-__v"),
  ]);

  return {
    collegeEmail: normalizeEmail(approvedApplication?.ownerEmail || collegeUser?.email || ""),
    collegeName: normalizeText(approvedApplication?.collegeName || collegeUser?.name || "Unassigned College"),
    collegeUser: collegeUser || null,
    approvedApplication: approvedApplication || null,
  };
}

async function buildSuperAdminDataset() {
  const [users, courses, collegeApplications, collegeMembers] = await Promise.all([
    User.find().sort({ id: 1 }).select("-__v"),
    Course.find().sort({ id: 1 }).select("-__v"),
    CollegeApplication.find().sort({ id: -1 }).select("-__v"),
    CollegeMember.find().sort({ id: 1 }).select("-__v"),
  ]);

  const primaryCollege = await resolvePrimaryCollegeContext();
  const collegeEmailFallback = primaryCollege.collegeEmail;
  const collegeNameFallback = primaryCollege.collegeName;
  const platformTeachers = users.filter((item) => item.role === "teacher");
  const platformStudents = users.filter((item) => item.role === "student");

  const teacherSource = buildUniqueList(
    [
      ...platformTeachers.map((item) => ({
        source: "user",
        id: item.id,
        name: item.name,
        email: item.email,
        regId: item.regId || "",
        phone: item.phoneNumber || "",
        branch: item.branch || "",
        subject: item.subject || "",
        status: item.status || "active",
        collegeEmail: item.collegeEmail || collegeEmailFallback,
      })),
      ...collegeMembers
        .filter((item) => item.role === "teacher")
        .map((item) => ({
          source: "college-member",
          id: item.id,
          name: item.name,
          email: item.email,
          regId: item.regId,
          phone: item.phone,
          branch: item.branch,
          subject: item.subject || "",
          status: item.status || "active",
          collegeEmail: item.collegeEmail || collegeEmailFallback,
        })),
    ],
    (item) => item.email || `${item.name}-${item.regId}`
  );

  const studentSource = buildUniqueList(
    [
      ...platformStudents.map((item) => ({
        source: "user",
        id: item.id,
        name: item.name,
        email: item.email,
        regId: item.regId || "",
        phone: item.phoneNumber || "",
        branch: item.branch || "",
        course: item.course || "",
        year: item.year || "",
        status: item.status || "active",
        collegeEmail: item.collegeEmail || collegeEmailFallback,
      })),
      ...collegeMembers
        .filter((item) => item.role === "student")
        .map((item) => ({
          source: "college-member",
          id: item.id,
          name: item.name,
          email: item.email,
          regId: item.regId,
          phone: item.phone,
          branch: item.branch,
          course: item.course || "",
          year: item.year || "",
          status: item.status || "active",
          collegeEmail: item.collegeEmail || collegeEmailFallback,
        })),
    ],
    (item) => item.email || `${item.name}-${item.regId}`
  );

  const approvedColleges = collegeApplications
    .filter((item) => item.status === "approved")
    .map((application) => ({
      id: application.id,
      name: application.collegeName,
      ownerName: application.ownerName,
      ownerEmail: application.ownerEmail,
      phone: application.phone,
      website: application.website,
      city: application.city,
      state: application.state,
      country: application.country,
      programs: application.programs,
      studentsRequested: application.students,
      facilities: application.facilities,
      summary: application.summary,
      status: application.status,
      submittedAt: application.submittedAt,
      reviewedAt: application.reviewedAt,
    }));

  const collegeLookup = new Map();
  approvedColleges.forEach((college) => {
    collegeLookup.set(normalizeEmail(college.ownerEmail), college);
  });

  const normalizedTeachers = teacherSource.map((member) => {
    const collegeEmail = normalizeEmail(member.collegeEmail || collegeEmailFallback);
    const college = collegeLookup.get(collegeEmail);
    const teacherKey = normalizeKey(member.email) || normalizeKey(member.name);
    const teacherCourses = courses.filter((course) => {
      const courseTeacherKey = normalizeKey(course.createdBy) || normalizeKey(course.teacherName);
      return courseTeacherKey === teacherKey && normalizeEmail(course.collegeEmail || collegeEmailFallback) === collegeEmail;
    });

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      regId: member.regId,
      phone: member.phone,
      branch: member.branch,
      subject: member.subject,
      status: member.status || "active",
      collegeEmail,
      collegeName: college?.name || collegeNameFallback,
      courseCount: teacherCourses.length,
      courses: teacherCourses.map((course) => ({ id: course.id, title: course.title, status: course.status })),
    };
  });

  const normalizedStudents = studentSource.map((member) => {
    const collegeEmail = normalizeEmail(member.collegeEmail || collegeEmailFallback);
    const college = collegeLookup.get(collegeEmail);
    const studentCourses = courses.filter((course) => normalizeEmail(course.collegeEmail || collegeEmailFallback) === collegeEmail);

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      regId: member.regId,
      phone: member.phone,
      branch: member.branch,
      course: member.course,
      year: member.year,
      status: member.status || "active",
      collegeEmail,
      collegeName: college?.name || collegeNameFallback,
      enrolledCourses: studentCourses.length,
    };
  });

  const normalizedCourses = courses.map((course) => {
    const collegeEmail = normalizeEmail(course.collegeEmail || collegeEmailFallback);
    const college = collegeLookup.get(collegeEmail);
    const courseTeacherKey = normalizeKey(course.createdBy) || normalizeKey(course.teacherName);
    const teacher = collegeMembers.find((member) => {
      if (member.role !== "teacher") return false;
      const teacherKey = normalizeKey(member.email) || normalizeKey(member.name);
      return teacherKey === courseTeacherKey;
    });

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      category: course.category,
      difficulty: course.difficulty,
      rating: course.rating,
      reviews: course.reviews,
      price: course.price,
      image: course.image,
      badge: course.badge,
      students: course.students,
      progress: course.progress,
      status: course.status,
      createdBy: course.createdBy,
      teacherName: teacher?.name || course.teacherName || course.createdBy || "Unknown Teacher",
      collegeEmail,
      collegeName: college?.name || collegeNameFallback,
      unitCount: Array.isArray(course.units) ? course.units.length : 0,
      lectureCount: Array.isArray(course.units) ? course.units.reduce((sum, unit) => sum + (unit.lectures?.length || 0), 0) : 0,
      moduleCount: Array.isArray(course.units)
        ? course.units.reduce((sum, unit) => sum + (unit.lectures || []).reduce((lectureSum, lecture) => lectureSum + (lecture.modules?.length || 0), 0), 0)
        : 0,
    };
  });

  const collegeRows = approvedColleges.map((college) => {
    const collegeEmail = normalizeEmail(college.ownerEmail);
    const teacherCount = normalizedTeachers.filter((teacher) => teacher.collegeEmail === collegeEmail).length;
    const studentCount = normalizedStudents.filter((student) => student.collegeEmail === collegeEmail).length;
    const courseCount = normalizedCourses.filter((course) => course.collegeEmail === collegeEmail).length;

    return {
      ...college,
      collegeEmail,
      teacherCount,
      studentCount,
      courseCount,
    };
  });

  const pendingCourses = normalizedCourses.filter((course) => String(course.status || "pending").toLowerCase() === "pending");
  const pendingApplications = collegeApplications.filter((application) => application.status === "pending");

  const metrics = {
    colleges: collegeRows.length,
    teachers: normalizedTeachers.length,
    students: normalizedStudents.length,
    courses: normalizedCourses.length,
    pendingColleges: pendingApplications.length,
    pendingCourses: pendingCourses.length,
  };

  return {
    primaryCollege,
    metrics,
    colleges: collegeRows,
    teachers: normalizedTeachers,
    students: normalizedStudents,
    courses: normalizedCourses,
    approvals: {
      collegeApplications: pendingApplications,
      courses: pendingCourses,
    },
  };
}

router.get("/dataset", async (_req, res) => {
  try {
    const data = await buildSuperAdminDataset();
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch super admin dataset" });
  }
});

router.get("/overview", async (_req, res) => {
  try {
    const [users, courses, guides, superAdminAnnouncements, events] = await Promise.all([
      User.find().sort({ id: 1 }).select("-__v"),
      Course.find().sort({ id: 1 }).select("-__v"),
      Guide.find().sort({ id: 1 }).select("-__v"),
      Announcement.find({ panel: "superadmin" }).sort({ id: -1 }).select("-__v"),
      Event.find({ panel: "superadmin" }).sort({ id: -1 }).select("-__v"),
    ]);

    const colleges = users.filter((item) => item.role === "college");
    const admins = users.filter((item) => item.role === "admin");
    const studentsCount = users.filter((item) => item.role === "student").length;
    const activeUsers = users.filter((item) => item.status !== "suspended" && item.status !== "banned").length;
    const paidCourses = courses.filter((item) => item.price !== "Free");
    const totalRevenue = paidCourses.reduce((sum, item) => {
      const normalized = String(item.price || "").replace(/[^\d.]/g, "");
      const amount = Number(normalized);
      const learners = Number(item.students || 0);
      return sum + (Number.isFinite(amount) ? amount : 0) * learners;
    }, 0);

    const institutions = colleges.map((item, index) => ({
      id: item.id,
      name: item.name,
      location: "India",
      students: Math.max(1200, studentsCount * 120 + index * 350),
      status: toTitleCase(item.status || "active"),
    }));

    const userRows = users.map((item) => ({
      id: item.id,
      name: item.name,
      role: toTitleCase(item.role),
      status: toTitleCase(item.status || "active"),
      email: item.email,
    }));

    const moderation = guides.slice(0, 10).map((item) => ({
      id: item.id,
      title: item.title,
      creator: item.category,
      status: toTitleCase(item.status || "pending"),
    }));

    const coursesList = courses.slice(0, 10).map((item) => ({
      id: item.id,
      title: item.title,
      learners: Number(item.students || 0),
    }));

    const taggedForAudio = courses.filter((item) =>
      (item.accessibilityTags || []).some((tag) => /tts|audio/i.test(String(tag)))
    ).length;
    const taggedForAltText = courses.filter((item) =>
      (item.accessibilityTags || []).some((tag) => /a11y|alt|caption/i.test(String(tag)))
    ).length;

    const audioPercent = courses.length > 0 ? Math.round((taggedForAudio / courses.length) * 100) : 0;
    const altTextPercent = courses.length > 0 ? Math.round((taggedForAltText / courses.length) * 100) : 0;

    const nonCompliant = guides
      .filter((item) => String(item.status).toLowerCase() !== "approved")
      .slice(0, 8)
      .map((item) => `${item.title} - ${toTitleCase(item.status)}`);

    const transactions = colleges.map((item, index) => ({
      id: index + 1,
      date: new Date(Date.now() - index * 86400000).toISOString().slice(0, 10),
      college: item.name,
      amount: 12000 + index * 4500,
      status: index % 3 === 2 ? "Pending" : "Success",
    }));

    const activityLogs = [
      ...superAdminAnnouncements.map((item) => ({
        date: item.date,
        type: "Admin",
        action: `Announcement published: ${item.title}`,
      })),
      ...events.map((item) => ({
        date: item.date,
        type: "Admin",
        action: `Scheduled event: ${item.name}`,
      })),
    ].slice(0, 15);

    res.json({
      data: {
        metrics: {
          colleges: colleges.length,
          users: users.length,
          courses: courses.length,
          activeUsers,
          totalRevenue,
        },
        institutions,
        users: userRows,
        admins: admins.map((item) => item.name),
        courses: coursesList,
        moderation,
        accessibility: {
          audio: audioPercent,
          altText: altTextPercent,
          score: Math.round((audioPercent + altTextPercent) / 2),
          nonCompliant,
        },
        finance: {
          totalRevenue,
          monthlyRevenue: Math.round(totalRevenue / 12),
          transactions,
        },
        logs: activityLogs,
        announcements: superAdminAnnouncements,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch super admin overview" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const { role, status } = req.query;
    const query = {};

    if (role) {
      query.role = String(role).toLowerCase();
    }

    if (status) {
      query.status = String(status).toLowerCase();
    }

    const users = await User.find(query).sort({ id: 1 }).select("-__v");
    res.json({ data: users, total: users.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const query = resolveUserQuery(req.params.id);

    if (!query) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const status = String(req.body?.status || "").toLowerCase();
    const validStatuses = ["active", "suspended", "banned"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "status must be one of: active, suspended, banned" });
    }

    const user = await User.findOneAndUpdate(query, { status }, { new: true }).select("-__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user status" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const query = resolveUserQuery(req.params.id);
    if (!query) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const deleted = await User.findOneAndDelete(query);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ data: { deleted: true, id: deleted.id } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

router.get("/announcements", async (_req, res) => {
  try {
    const announcements = await Announcement.find({ panel: "superadmin" }).sort({ id: -1 }).select("-__v");
    res.json({ data: announcements, total: announcements.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch super admin announcements" });
  }
});

router.get("/college-applications", async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};

    if (status) {
      query.status = String(status).toLowerCase();
    }

    const applications = await CollegeApplication.find(query).sort({ id: -1 }).select("-__v");
    res.json({ data: applications, total: applications.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch college applications" });
  }
});

router.post("/college-applications", async (req, res) => {
  try {
    const {
      collegeName,
      ownerName,
      ownerEmail,
      phone,
      website = "",
      city,
      state,
      country,
      affiliation = "",
      programs = "",
      students = 0,
      facilities = "",
      summary = "",
    } = req.body || {};

    if (!collegeName || !ownerName || !ownerEmail || !phone || !city || !state || !country) {
      return res.status(400).json({ message: "Required college application fields are missing" });
    }

    const application = await CollegeApplication.create({
      id: await nextCollegeApplicationId(),
      collegeName,
      ownerName,
      ownerEmail: String(ownerEmail).toLowerCase(),
      phone,
      website,
      city,
      state,
      country,
      affiliation,
      programs,
      students: Number(students) || 0,
      facilities,
      summary,
      status: "pending",
      submittedAt: new Date().toISOString(),
    });

    res.status(201).json({ data: application });
  } catch (error) {
    res.status(500).json({ message: "Failed to create college application" });
  }
});

router.patch("/college-applications/:id/approve", async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    const applicationQuery = Number.isNaN(applicationId) ? { _id: req.params.id } : { id: applicationId };

    const application = await CollegeApplication.findOne(applicationQuery);
    if (!application) {
      return res.status(404).json({ message: "College application not found" });
    }

    const ownerEmail = String(application.ownerEmail || "").toLowerCase();
    const existingUser = await User.findOne({ email: ownerEmail });
    let collegeUser = existingUser;

    if (!collegeUser) {
      collegeUser = await User.create({
        id: await nextUserId(),
        name: application.collegeName,
        email: ownerEmail,
        role: "college",
        status: "active",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(application.collegeName)}`,
        regId: `CLG-${String(application.id).padStart(4, "0")}`,
        branch: "",
        phoneNumber: application.phone,
      });
    } else {
      collegeUser.role = "college";
      collegeUser.status = "active";
      collegeUser.email = ownerEmail;
      collegeUser.name = application.collegeName || collegeUser.name;
      collegeUser.regId = collegeUser.regId || `CLG-${String(application.id).padStart(4, "0")}`;
      collegeUser.phoneNumber = application.phone || collegeUser.phoneNumber || "";
      if (!String(collegeUser.avatar || "").trim()) {
        collegeUser.avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(application.collegeName)}`;
      }
      await collegeUser.save();
    }

    application.status = "approved";
    application.reviewedAt = new Date().toISOString();
    await application.save();

    res.json({ data: { application, user: collegeUser } });
  } catch (error) {
    res.status(500).json({ message: "Failed to approve college application" });
  }
});

router.patch("/college-applications/:id/reject", async (req, res) => {
  try {
    const applicationId = Number(req.params.id);
    const applicationQuery = Number.isNaN(applicationId) ? { _id: req.params.id } : { id: applicationId };

    const application = await CollegeApplication.findOne(applicationQuery);
    if (!application) {
      return res.status(404).json({ message: "College application not found" });
    }

    application.status = "rejected";
    application.reviewedAt = new Date().toISOString();
    await application.save();

    res.json({ data: application });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject college application" });
  }
});

router.post("/announcements", async (req, res) => {
  try {
    const { title, description, date, tag = "General" } = req.body || {};

    if (!title || !description || !date) {
      return res.status(400).json({ message: "title, description and date are required" });
    }

    const announcement = await Announcement.create({
      id: await nextAnnouncementId(),
      title,
      description,
      date,
      tag,
      panel: "superadmin",
    });

    res.status(201).json({ data: announcement });
  } catch (error) {
    res.status(500).json({ message: "Failed to create super admin announcement" });
  }
});

export default router;