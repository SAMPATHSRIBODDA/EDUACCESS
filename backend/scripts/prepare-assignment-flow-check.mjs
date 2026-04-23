import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectToDatabase } from "../src/config/db.js";
import { Assignment } from "../src/models/Assignment.js";
import { CollegeMember } from "../src/models/CollegeMember.js";
import { Course } from "../src/models/Course.js";
import { CourseEnrollment } from "../src/models/CourseEnrollment.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

function normalizeQuestions(assignment) {
  const mcqQuestions = [];
  const codeQuestions = [];
  const type = assignment.assignmentType || "mcq";

  if (type === "mcq") {
    if (Array.isArray(assignment.questions) && assignment.questions.length > 0) {
      mcqQuestions.push(...assignment.questions);
    } else if (assignment.mcqQuestion && Array.isArray(assignment.options) && assignment.options.length > 0) {
      mcqQuestions.push({
        id: "q-legacy-1",
        question: assignment.mcqQuestion,
        options: assignment.options,
        correctOptionId: assignment.correctOptionId || assignment.options[0]?.id || "",
      });
    }
  }

  if (type === "code") {
    if (Array.isArray(assignment.codeQuestions) && assignment.codeQuestions.length > 0) {
      codeQuestions.push(...assignment.codeQuestions);
    } else if (assignment.prompt || assignment.codeStarter || (assignment.testCases || []).length > 0) {
      codeQuestions.push({
        id: "code-legacy-1",
        prompt: assignment.prompt || "",
        codeStarter: assignment.codeStarter || "function solve() { return 0; }",
        language: assignment.language || "js",
        testCases: assignment.testCases || [],
      });
    }
  }

  if (type === "mixed") {
    (assignment.sections || []).forEach((section) => {
      if (section.sectionType === "mcq") mcqQuestions.push(...(section.mcqQuestions || []));
      if (section.sectionType === "code") codeQuestions.push(...(section.codeQuestions || []));
    });
  }

  return { mcqQuestions, codeQuestions };
}

async function nextId(Model, field = "id") {
  const latest = await Model.findOne().sort({ [field]: -1 }).select(field);
  return latest ? Number(latest[field]) + 1 : 1;
}

async function main() {
  await connectToDatabase();

  let assignment = await Assignment.findOne({ title: "Flow Check Assignment" });
  if (!assignment) {
    assignment = await Assignment.findOne({
      $or: [
        { assignmentType: "mcq", "questions.0": { $exists: true } },
        { assignmentType: "code", prompt: { $ne: "" } },
      ],
    }).sort({ id: -1 });
  }

  if (!assignment) {
    const assignmentId = await nextId(Assignment);
    assignment = await Assignment.create({
      id: assignmentId,
      title: "Flow Check Assignment",
      course: "Flow QA Course",
      due: "Apr 30",
      openDate: "",
      closeDate: "",
      submissions: "0/0",
      status: "Pending",
      assignmentType: "mcq",
      language: "js",
      timeLimit: 30,
      teacherEmail: "teacher@edu.com",
      questions: [
        {
          id: "q-1",
          question: "2 + 2 = ?",
          options: [
            { id: "opt-1", text: "4" },
            { id: "opt-2", text: "5" },
            { id: "opt-3", text: "6" },
            { id: "opt-4", text: "7" },
          ],
          correctOptionId: "opt-1",
        },
      ],
      sections: [],
      codeQuestions: [],
      testCases: [],
      options: [],
    });
  }

  const courseTitle = String(assignment.course || "Flow QA Course").trim();
  let course = await Course.findOne({ title: courseTitle }).select("id title");
  if (!course) {
    const courseId = await nextId(Course);
    course = await Course.create({
      id: courseId,
      title: courseTitle,
      description: "QA verification course",
      category: "QA",
      difficulty: "Beginner",
      rating: 5,
      reviews: "1",
      price: "Free",
      image: "",
      badge: "",
      accessibilityTags: [],
      topic: "QA",
      grade: "",
      students: 0,
      progress: 0,
      icon: "",
      panels: ["student", "teacher"],
      units: [],
      status: "approved",
      createdBy: "teacher@edu.com",
    });
  }

  const studentEmail = "qa.student@edu.com";
  let student = await CollegeMember.findOne({ role: "student", email: studentEmail });
  if (!student) {
    const memberId = await nextId(CollegeMember);
    student = await CollegeMember.create({
      id: memberId,
      role: "student",
      name: "QA Student",
      regId: `QA-${memberId}`,
      email: studentEmail,
      avatar: "",
      phone: "9000000000",
      branch: "QA",
      course: courseTitle,
      year: "1",
      subject: "Testing",
      status: "active",
    });
  } else if (String(student.course || "") !== courseTitle) {
    student.course = courseTitle;
    await student.save();
  }

  await CourseEnrollment.findOneAndUpdate(
    { studentEmail, courseId: course.id },
    {
      $set: {
        paymentStatus: "free",
        amountPaid: 0,
        currency: "INR",
        paymentOrderId: "",
        paymentId: "",
        paymentSignature: "",
      },
      $setOnInsert: {
        enrolledAt: new Date(),
      },
      $currentDate: {
        lastAccessedAt: true,
      },
    },
    { upsert: true, new: true }
  );

  const { mcqQuestions, codeQuestions } = normalizeQuestions(assignment);
  const mcqAnswers = {};
  mcqQuestions.forEach((q) => {
    const fallback = q.options?.[0]?.id || "";
    mcqAnswers[q.id] = q.correctOptionId || fallback;
  });

  const codeAnswers = {};
  codeQuestions.forEach((q) => {
    codeAnswers[q.id] = q.codeStarter || "function solve() { return 0; }";
  });

  console.log(JSON.stringify({
    assignmentId: assignment.id,
    assignmentTitle: assignment.title,
    courseTitle,
    courseId: course.id,
    studentEmail,
    mcqAnswerKeys: Object.keys(mcqAnswers),
    codeAnswerKeys: Object.keys(codeAnswers),
  }));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
