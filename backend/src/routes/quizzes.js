import { Router } from "express";
import { CollegeMember } from "../models/CollegeMember.js";
import { Course } from "../models/Course.js";
import { Quiz } from "../models/Quiz.js";
import { QuizSubmission } from "../models/QuizSubmission.js";
import { CourseEnrollment } from "../models/CourseEnrollment.js";

const router = Router();

async function nextQuizId() {
  const latest = await Quiz.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options
    .map((option, index) => ({
      id: String(option?.id || `opt-${index + 1}`).trim(),
      text: String(option?.text || "").trim(),
    }))
    .filter((option) => option.id && option.text);
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question, index) => {
      const options = normalizeOptions(question?.options);
      return {
        id: String(question?.id || `q-${index + 1}`).trim(),
        question: String(question?.question || "").trim(),
        options,
        correctOptionId: String(question?.correctOptionId || "").trim(),
      };
    })
    .filter((question) => question.id && question.question && question.options.length >= 2 && question.correctOptionId);
}

async function buildQuizResponse(quiz) {
  const enrolledStudents = await CollegeMember.countDocuments({ role: "student", course: quiz.course });
  const submissions = await QuizSubmission.find({ quizId: quiz.id }).select("score studentEmail submittedAt");
  const attemptsCount = submissions.length;
  const avgScoreNumber = attemptsCount
    ? Math.round(submissions.reduce((sum, row) => sum + (Number(row.score) || 0), 0) / attemptsCount)
    : 0;

  return {
    ...quiz.toObject(),
    enrolledStudents,
    attemptsCount,
    avgScoreNumber,
    attempts: `${attemptsCount} Attempts`,
    avgScore: `${avgScoreNumber}% Avg`,
  };
}

router.get("/", async (req, res) => {
  try {
    const { teacherEmail, status, course, collegeEmail } = req.query;
    const query = {};

    if (collegeEmail) query.collegeEmail = String(collegeEmail).toLowerCase();
    if (teacherEmail) query.teacherEmail = String(teacherEmail).toLowerCase();
    if (status) query.status = String(status);
    if (course) query.course = String(course);

    const quizzes = await Quiz.find(query).sort({ id: 1 }).select("-__v");
    const payload = [];

    for (const quiz of quizzes) {
      payload.push(await buildQuizResponse(quiz));
    }

    res.json({ data: payload, total: payload.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch quizzes" });
  }
});

router.get("/attempts/student", async (req, res) => {
  try {
    const studentEmail = String(req.query.studentEmail || "").trim().toLowerCase();
    if (!studentEmail) {
      return res.status(400).json({ message: "studentEmail is required" });
    }

    const submissions = await QuizSubmission.find({ studentEmail }).sort({ submittedAt: -1 }).select("-__v");
    const quizIds = [...new Set(submissions.map((item) => item.quizId))];
    const quizzes = quizIds.length > 0 ? await Quiz.find({ id: { $in: quizIds } }).select("id title course") : [];
    const quizMap = new Map(quizzes.map((item) => [item.id, item]));

    const summaryByQuiz = new Map();
    for (const row of submissions) {
      const key = row.quizId;
      const current = summaryByQuiz.get(key) || {
        quizId: key,
        attemptsCount: 0,
        bestScore: 0,
        lastScore: 0,
        lastWarningCount: 0,
        lastSubmittedAt: null,
      };

      current.attemptsCount += 1;
      current.bestScore = Math.max(current.bestScore, Number(row.score) || 0);
      if (!current.lastSubmittedAt || new Date(row.submittedAt) > new Date(current.lastSubmittedAt)) {
        current.lastSubmittedAt = row.submittedAt;
        current.lastScore = Number(row.score) || 0;
        current.lastWarningCount = Number(row.warningCount) || 0;
      }

      summaryByQuiz.set(key, current);
    }

    const enriched = submissions.map((row) => {
      const quiz = quizMap.get(row.quizId);
      return {
        ...row.toObject(),
        quizTitle: quiz?.title || `Quiz #${row.quizId}`,
        quizCourse: quiz?.course || "",
      };
    });

    res.json({ data: enriched, summary: Array.from(summaryByQuiz.values()) });
  } catch {
    res.status(500).json({ message: "Failed to fetch quiz attempts" });
  }
});

router.post("/:id/attempts", async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const { studentEmail, answers = {}, warningCount = 0, timeTakenSeconds = 0 } = req.body || {};
    const normalizedEmail = String(studentEmail || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "studentEmail is required" });
    }

    const quiz = await Quiz.findOne({ id: quizId }).select("id title course status questions openDate closeDate");
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    const course = await Course.findOne({ title: quiz.course }).select("id title");
    if (!course) {
      return res.status(400).json({ message: "Quiz course is not available" });
    }

    const enrollment = await CourseEnrollment.findOne({
      studentEmail: normalizedEmail,
      courseId: course.id,
    }).select("studentEmail courseId");

    if (!enrollment) {
      return res.status(403).json({ message: "Enroll in this course before attempting the quiz" });
    }

    if (quiz.status !== "active") {
      return res.status(400).json({ message: "Quiz is not active" });
    }

    const now = new Date();
    if (quiz.openDate) {
      const startAt = new Date(quiz.openDate);
      if (!Number.isNaN(startAt.getTime()) && now < startAt) {
        return res.status(400).json({ message: "Quiz is not open yet" });
      }
    }
    if (quiz.closeDate) {
      const endAt = new Date(quiz.closeDate);
      if (!Number.isNaN(endAt.getTime()) && now > endAt) {
        return res.status(400).json({ message: "Quiz has closed" });
      }
    }

    const normalizedAnswers = typeof answers === "object" && answers ? answers : {};
    const total = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
    const correct = quiz.questions.reduce((count, question) => {
      return normalizedAnswers[question.id] === question.correctOptionId ? count + 1 : count;
    }, 0);
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const previousAttempts = await QuizSubmission.countDocuments({ quizId, studentEmail: normalizedEmail });
    const attempt = await QuizSubmission.create({
      quizId,
      studentEmail: normalizedEmail,
      answers: normalizedAnswers,
      score,
      total,
      warningCount: Math.max(0, Number(warningCount) || 0),
      timeTakenSeconds: Math.max(0, Number(timeTakenSeconds) || 0),
      attemptNumber: previousAttempts + 1,
      submittedAt: new Date(),
    });

    res.status(201).json({ data: attempt.toObject() });
  } catch {
    res.status(500).json({ message: "Failed to submit quiz attempt" });
  }
});

router.get("/:id/results", async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const teacherEmail = String(req.query.teacherEmail || "").trim().toLowerCase();
    const quiz = await Quiz.findOne({ id: quizId }).select("id title course teacherEmail");
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (teacherEmail && quiz.teacherEmail !== teacherEmail) {
      return res.status(403).json({ message: "You cannot view results for this quiz" });
    }

    const course = await Course.findOne({ title: quiz.course }).select("id title");
    const enrolledRows = course ? await CourseEnrollment.find({ courseId: course.id }).select("studentEmail") : [];
    const rosterMembers = await CollegeMember.find({ role: "student", course: quiz.course }).select("name email regId");

    const rosterEmailSet = new Set();
    const rosterByEmail = new Map();

    for (const member of rosterMembers) {
      const email = String(member.email || "").trim().toLowerCase();
      if (!email) continue;
      rosterEmailSet.add(email);
      rosterByEmail.set(email, {
        name: member.name,
        email,
        regId: member.regId,
      });
    }

    for (const row of enrolledRows) {
      const email = String(row.studentEmail || "").trim().toLowerCase();
      if (!email) continue;
      rosterEmailSet.add(email);
      if (!rosterByEmail.has(email)) {
        rosterByEmail.set(email, {
          name: email.split("@")[0],
          email,
          regId: "",
        });
      }
    }

    const submissions = await QuizSubmission.find({ quizId }).sort({ submittedAt: -1 }).select("-__v");
    const attemptsByEmail = new Map();

    for (const row of submissions) {
      const email = String(row.studentEmail || "").trim().toLowerCase();
      if (!email) continue;
      if (!attemptsByEmail.has(email)) {
        attemptsByEmail.set(email, []);
      }
      attemptsByEmail.get(email).push(row);
      rosterEmailSet.add(email);
      if (!rosterByEmail.has(email)) {
        rosterByEmail.set(email, {
          name: email.split("@")[0],
          email,
          regId: "",
        });
      }
    }

    const attempted = [];
    const pending = [];

    rosterEmailSet.forEach((email) => {
      const base = rosterByEmail.get(email) || { name: email.split("@")[0], email, regId: "" };
      const records = attemptsByEmail.get(email) || [];
      if (records.length === 0) {
        pending.push(base);
        return;
      }

      const latest = records[0];
      const bestScore = records.reduce((max, row) => Math.max(max, Number(row.score) || 0), 0);
      attempted.push({
        ...base,
        attemptsCount: records.length,
        bestScore,
        lastScore: Number(latest.score) || 0,
        lastWarningCount: Number(latest.warningCount) || 0,
        lastSubmittedAt: latest.submittedAt,
      });
    });

    const averageBestScore = attempted.length
      ? Math.round(attempted.reduce((sum, row) => sum + row.bestScore, 0) / attempted.length)
      : 0;

    res.json({
      data: {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          course: quiz.course,
        },
        attempted,
        pending,
        stats: {
          assignedCount: rosterEmailSet.size,
          attemptedCount: attempted.length,
          pendingCount: pending.length,
          averageBestScore,
        },
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to load quiz results" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      course,
      teacherEmail = "teacher@edu.com",
      status = "active",
      questions = [],
      openDate = "",
      closeDate = "",
      timeLimit = 0,
      attempts = "0 Attempts",
      avgScore = "0% Avg",
      collegeEmail = "",
    } = req.body || {};

    if (!title || !course) {
      return res.status(400).json({ message: "title and course are required" });
    }

    const normalizedQuestions = normalizeQuestions(questions);
    if (normalizedQuestions.length === 0) {
      return res.status(400).json({ message: "At least one valid MCQ question is required" });
    }

    const selectedCourse = await Course.findOne({ title: String(course).trim(), status: "approved" }).select("id title");
    if (!selectedCourse) {
      return res.status(400).json({ message: "Selected course is not approved or does not exist" });
    }

    const quiz = await Quiz.create({
      id: await nextQuizId(),
      title: String(title).trim(),
      course: String(course).trim(),
      teacherEmail: String(teacherEmail).toLowerCase(),
      status,
      questions: normalizedQuestions,
      openDate: String(openDate).trim(),
      closeDate: String(closeDate).trim(),
      timeLimit: Number(timeLimit) || 0,
      attempts,
      avgScore,
      collegeEmail: String(collegeEmail).toLowerCase(),
    });

    res.status(201).json({ data: await buildQuizResponse(quiz) });
  } catch (error) {
    res.status(500).json({ message: "Failed to create quiz" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const updates = {};
    const allowedFields = ["title", "course", "teacherEmail", "status", "attempts", "avgScore", "questions", "openDate", "closeDate", "timeLimit", "collegeEmail"];

    allowedFields.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        if (field === "teacherEmail") {
          updates[field] = String(req.body[field]).toLowerCase();
          return;
        }

        if (field === "course" || field === "title" || field === "attempts" || field === "avgScore" || field === "status" || field === "openDate" || field === "closeDate") {
          updates[field] = String(req.body[field]).trim();
          return;
        }

        if (field === "timeLimit") {
          updates[field] = Number(req.body[field]) || 0;
          return;
        }

        if (field === "questions") {
          const normalizedQuestions = normalizeQuestions(req.body[field]);
          if (normalizedQuestions.length === 0) {
            return res.status(400).json({ message: "At least one valid MCQ question is required" });
          }
          updates[field] = normalizedQuestions;
          return;
        }
      }
    });

    const quiz = await Quiz.findOneAndUpdate({ id: quizId }, updates, { new: true, runValidators: true }).select("-__v");
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json({ data: await buildQuizResponse(quiz) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update quiz" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const quizId = Number(req.params.id);
    if (Number.isNaN(quizId)) {
      return res.status(400).json({ message: "Invalid quiz id" });
    }

    const deleted = await Quiz.findOneAndDelete({ id: quizId });
    if (!deleted) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json({ data: { deleted: true, id: quizId } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete quiz" });
  }
});

export default router;
