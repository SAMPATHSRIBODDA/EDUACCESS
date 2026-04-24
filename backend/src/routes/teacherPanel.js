import { Router } from "express";
import { Announcement } from "../models/Announcement.js";
import { Assignment } from "../models/Assignment.js";
import { Course } from "../models/Course.js";
import { CourseEnrollment } from "../models/CourseEnrollment.js";
import { Event } from "../models/Event.js";
import { User } from "../models/User.js";
import { Quiz } from "../models/Quiz.js";
import { CollegeMember } from "../models/CollegeMember.js";

const router = Router();

router.get("/overview", async (req, res) => {
  try {
    const teacherEmail = String(req.query?.teacherEmail || "").toLowerCase().trim();
    if (!teacherEmail) {
      return res.status(400).json({ message: "Teacher email is required" });
    }

    const [teacherCourses, events, announcements] = await Promise.all([
      Course.find({ createdBy: teacherEmail }).select("id title grade icon status"),
      Event.find({ panel: "teacher" }).sort({ id: 1 }).limit(10),
      Announcement.find({ panel: "teacher" }).sort({ id: -1 }).limit(5),
    ]);

    const teacherCourseIds = teacherCourses.map(c => Number(c.id)).filter(id => !isNaN(id));

    const [assignments, quizzes, enrollments] = await Promise.all([
      Assignment.find({ createdBy: teacherEmail }).sort({ id: 1 }),
      Quiz.find({ createdBy: teacherEmail }).sort({ id: 1 }),
      CourseEnrollment.find({ courseId: { $in: teacherCourseIds } }),
    ]);

    // Calculate Real Stats
    const totalStudents = new Set(enrollments.map(e => e.studentEmail)).size;
    const pendingAssignments = assignments.filter(a => a.status !== "Graded").length;
    
    // For average score, we'd ideally aggregate from submissions. 
    // For now, we'll return a calculated baseline or 0 if no data.
    const stats = [
      { label: "Total Students", value: String(totalStudents), trend: "Live enrollment" },
      { label: "Total Courses", value: String(teacherCourses.length), trend: "Teaching catalog" },
      {
        label: "Assignments",
        value: String(assignments.length),
        trend: `${pendingAssignments} Pending`,
      },
      { label: "Average Score", value: "0%", trend: "Calculated" }, // Initially 0% until submissions added
    ];

    res.json({ 
      data: { 
        stats, 
        students: [], // We fetch specifically in /students route
        courses: teacherCourses, 
        events, 
        announcements, 
        assignments, 
        quizzes 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch teacher panel overview" });
  }
});

router.get("/students", async (req, res) => {
  try {
    const teacherEmail = String(req.query?.teacherEmail || "teacher@edu.com").toLowerCase().trim() || "teacher@edu.com";
    
    // Look for teacher in CollegeMember for authoritative branch info
    const teacher = await CollegeMember.findOne({ email: teacherEmail, role: "teacher" });
    const teacherBranch = teacher?.branch || "General";

    const teacherCourses = await Course.find({ createdBy: teacherEmail }).select("id title");
    const teacherCourseIds = teacherCourses.map((course) => Number(course.id)).filter((id) => Number.isFinite(id));
    
    const enrollments = teacherCourseIds.length > 0
      ? await CourseEnrollment.find({ courseId: { $in: teacherCourseIds } }).select("studentEmail courseId paymentStatus enrolledAt")
      : [];

    const enrolledByStudent = new Map();
    const courseTitleById = new Map(teacherCourses.map((course) => [Number(course.id), String(course.title || "")]))

    enrollments.forEach((entry) => {
      const email = String(entry.studentEmail || "").toLowerCase();
      if (!email) return;
      const current = enrolledByStudent.get(email) || [];
      current.push({
        courseId: Number(entry.courseId),
        courseTitle: courseTitleById.get(Number(entry.courseId)) || `Course ${entry.courseId}`,
        paymentStatus: String(entry.paymentStatus || "free"),
        enrolledAt: entry.enrolledAt,
      });
      enrolledByStudent.set(email, current);
    });

    // Find students in CollegeMember instead of User for more reliable branch info
    const students = await CollegeMember.find({ role: "student" }).select("-__v");

    const enrichedStudents = students.map((student) => {
      const studentEmail = String(student.email || "").toLowerCase();
      
      // Real data checks
      const enrolledCourses = enrolledByStudent.get(studentEmail) || [];
      const activeCourse = enrolledCourses.map((item) => item.courseTitle).join(", ") || "N/A";
      const branch = student.branch || "General";

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        regId: student.regId || "N/A",
        phoneNumber: student.phone || "N/A",
        course: activeCourse,
        year: student.year || "N/A",
        branch,
        belongsToBranch: branch.toUpperCase() === teacherBranch.toUpperCase() && branch !== "General",
        isOpted: enrolledCourses.length > 0,
        activeCourse,
        enrolledCourses,
        avatar: student.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.name)}`
      };
    });

    const branchStudents = enrichedStudents.filter((student) => student.belongsToBranch);
    const optedStudents = enrichedStudents.filter((student) => student.isOpted);

    res.json({
      data: enrichedStudents,
      branch: teacherBranch,
      branchStudents,
      optedStudents,
      summary: {
        totalStudents: enrichedStudents.length,
        branchStudents: branchStudents.length,
        optedStudents: optedStudents.length,
        teacherCourses: teacherCourses.length,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch branch-synced students" });
  }
});

export default router;
