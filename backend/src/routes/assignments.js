import { Router } from "express";
import { Assignment } from "../models/Assignment.js";
import { CollegeMember } from "../models/CollegeMember.js";
import { AssignmentSubmission } from "../models/AssignmentSubmission.js";
import { Course } from "../models/Course.js";
import { CourseEnrollment } from "../models/CourseEnrollment.js";

const router = Router();

const ALLOWED_LANGUAGES = ["js", "javascript", "java", "cpp", "c++", "c", "python", "other"];

function normalizeLanguage(language) {
  const normalized = String(language || "js").toLowerCase().trim();
  return ALLOWED_LANGUAGES.includes(normalized) ? normalized : "js";
}

function normalizeAttachmentField(value) {
  return String(value || "").trim();
}

function normalizeCourseName(courseName) {
  return String(courseName || "").trim();
}

function normalizeMcqOptions(options) {
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
      const options = normalizeMcqOptions(question?.options);
      return {
        id: String(question?.id || `q-${index + 1}`).trim(),
        question: String(question?.question || "").trim(),
        options,
        correctOptionId: String(question?.correctOptionId || "").trim(),
      };
    })
    .filter((question) => question.id && question.question && question.options.length >= 2 && question.correctOptionId);
}

function normalizeTestCases(testCases) {
  if (!Array.isArray(testCases)) return [];

  return testCases
    .map((testCase) => ({
      input: String(testCase?.input || "").trim(),
      expectedOutput: String(testCase?.expectedOutput || "").trim(),
    }))
    .filter((testCase) => testCase.input && testCase.expectedOutput);
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];

  return sections
    .map((section, index) => {
      const type = String(section?.sectionType || "mcq");
      return {
        id: String(section?.id || `sec-${index + 1}`).trim(),
        title: String(section?.title || `Section ${index + 1}`).trim(),
        sectionType: type,
        mcqQuestions: type === "mcq" ? normalizeQuestions(section?.mcqQuestions) : [],
        codeQuestions: type === "code" ? (section?.codeQuestions || []).map((cq, cqIdx) => ({
          id: String(cq?.id || `cq-${index + 1}-${cqIdx + 1}`).trim(),
          prompt: String(cq?.prompt || "").trim(),
          codeStarter: String(cq?.codeStarter || "").trim(),
          language: normalizeLanguage(cq?.language),
          testCases: normalizeTestCases(cq?.testCases),
        })) : [],
      };
    })
    .filter((sec) => sec.id && sec.title && (sec.mcqQuestions.length > 0 || sec.codeQuestions.length > 0));
}

function parseCaseInput(inputText) {
  const trimmed = String(inputText || "").trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [trimmed];
  }
}

function tryParseExpectedOutput(expectedOutput) {
  const text = String(expectedOutput || "").trim();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function evaluateJavaScriptCode({ code, functionName, testCases }) {
  if (!code || !functionName || !Array.isArray(testCases) || testCases.length === 0) {
    return {
      passed: false,
      message: "code, functionName and testCases are required",
      results: [],
    };
  }

  const vm = await import("node:vm");
  const context = vm.createContext({});
  const wrappedCode = `"use strict";\n${code}`;
  try {
    new vm.Script(wrappedCode).runInContext(context, { timeout: 1000 });
  } catch (error) {
    return {
      passed: false,
      message: `Code execution error: ${String(error?.message || error)}`,
      results: [],
    };
  }

  const candidate = context[functionName];
  if (typeof candidate !== "function") {
    return {
      passed: false,
      message: `Function ${functionName} was not found in submitted code. Define function ${functionName}(...) and return the output.`,
      results: [],
    };
  }

  const results = testCases.map((testCase) => {
    const args = parseCaseInput(testCase.input);
    const expected = tryParseExpectedOutput(testCase.expectedOutput);

    try {
      const actual = candidate(...args);
      return {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: JSON.stringify(actual),
        pass: JSON.stringify(actual) === JSON.stringify(expected),
      };
    } catch (error) {
      return {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: String(error?.message || error),
        pass: false,
      };
    }
  });

  const passed = results.every((result) => result.pass);
  return {
    passed,
    message: passed ? "All test cases passed" : "Some test cases failed",
    results,
  };
}

async function buildAssignmentResponse(assignment) {
  const enrolledStudents = await CollegeMember.countDocuments({
    role: "student",
    course: assignment.course,
  });

  return {
    ...assignment.toObject(),
    enrolledStudents,
  };
}

async function nextAssignmentId() {
  const latest = await Assignment.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

function flattenAssignmentQuestions(assignment) {
  const mcqQuestions = [];
  const codeQuestions = [];

  if (assignment.assignmentType === "mcq") {
    if (Array.isArray(assignment.questions) && assignment.questions.length > 0) {
      mcqQuestions.push(...assignment.questions);
    } else if (assignment.mcqQuestion && Array.isArray(assignment.options) && assignment.options.length >= 2) {
      mcqQuestions.push({
        id: "q-legacy-1",
        question: assignment.mcqQuestion,
        options: assignment.options,
        correctOptionId: assignment.correctOptionId,
      });
    }
  }

  if (assignment.assignmentType === "code") {
    if (Array.isArray(assignment.codeQuestions) && assignment.codeQuestions.length > 0) {
      codeQuestions.push(...assignment.codeQuestions);
    } else if (assignment.prompt || assignment.codeStarter || (assignment.testCases || []).length > 0) {
      codeQuestions.push({
        id: "code-legacy-1",
        prompt: assignment.prompt,
        codeStarter: assignment.codeStarter,
        language: assignment.language,
        testCases: assignment.testCases || [],
      });
    }
  }

  if (assignment.assignmentType === "mixed" && Array.isArray(assignment.sections)) {
    assignment.sections.forEach((section) => {
      if (section.sectionType === "mcq") {
        mcqQuestions.push(...(section.mcqQuestions || []));
      }
      if (section.sectionType === "code") {
        codeQuestions.push(...(section.codeQuestions || []));
      }
    });
  }

  return { mcqQuestions, codeQuestions };
}

function buildAttemptSummary(submissions) {
  const summaryByAssignment = new Map();

  submissions.forEach((row) => {
    const key = row.assignmentId;
    const current = summaryByAssignment.get(key) || {
      assignmentId: key,
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

    summaryByAssignment.set(key, current);
  });

  return Array.from(summaryByAssignment.values());
}

router.get("/", async (req, res) => {
  try {
    const { teacherEmail, status, course } = req.query;
    const query = {};

    if (teacherEmail) query.teacherEmail = String(teacherEmail).toLowerCase();
    if (status) query.status = status;
    if (course) query.course = String(course).trim();

    const assignments = await Assignment.find(query).sort({ id: 1 }).select("-__v");
    const payload = [];

    for (const assignment of assignments) {
      payload.push(await buildAssignmentResponse(assignment));
    }

    res.json({ data: payload, total: payload.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch assignments" });
  }
});

router.get("/attempts/student", async (req, res) => {
  try {
    const studentEmail = String(req.query.studentEmail || "").trim().toLowerCase();
    if (!studentEmail) {
      return res.status(400).json({ message: "studentEmail is required" });
    }

    const submissions = await AssignmentSubmission.find({ studentEmail }).sort({ submittedAt: -1 }).select("-__v");
    const assignmentIds = [...new Set(submissions.map((row) => row.assignmentId))];
    const assignments = assignmentIds.length > 0
      ? await Assignment.find({ id: { $in: assignmentIds } }).select("id title course")
      : [];

    const assignmentMap = new Map(assignments.map((row) => [row.id, row]));
    const enriched = submissions.map((row) => {
      const assignment = assignmentMap.get(row.assignmentId);
      return {
        ...row.toObject(),
        assignmentTitle: assignment?.title || `Assignment #${row.assignmentId}`,
        assignmentCourse: assignment?.course || "",
      };
    });

    res.json({ data: enriched, summary: buildAttemptSummary(submissions) });
  } catch {
    res.status(500).json({ message: "Failed to fetch student assignment attempts" });
  }
});

router.post("/:id/attempts", async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (Number.isNaN(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const {
      studentEmail,
      mcqAnswers = {},
      codeAnswers = {},
      warningCount = 0,
      timeTakenSeconds = 0,
    } = req.body || {};

    const normalizedEmail = String(studentEmail || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "studentEmail is required" });
    }

    const assignment = await Assignment.findOne({ id: assignmentId }).select("-__v");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const now = new Date();
    if (assignment.openDate) {
      const startAt = new Date(assignment.openDate);
      if (!Number.isNaN(startAt.getTime()) && now < startAt) {
        return res.status(400).json({ message: "Assignment is not open yet" });
      }
    }
    if (assignment.closeDate) {
      const endAt = new Date(assignment.closeDate);
      if (!Number.isNaN(endAt.getTime()) && now > endAt) {
        return res.status(400).json({ message: "Assignment is closed" });
      }
    }

    const course = await Course.findOne({ title: assignment.course }).select("id title");
    if (course) {
      const enrollment = await CourseEnrollment.findOne({
        studentEmail: normalizedEmail,
        courseId: course.id,
      }).select("studentEmail courseId");

      if (!enrollment) {
        return res.status(403).json({ message: "Enroll in this course before attempting assignments" });
      }
    } else {
      const member = await CollegeMember.findOne({
        role: "student",
        email: normalizedEmail,
      }).select("course");

      const memberCourse = String(member?.course || "").trim().toLowerCase();
      const assignmentCourse = String(assignment.course || "").trim().toLowerCase();
      if (!member || !memberCourse || memberCourse !== assignmentCourse) {
        return res.status(403).json({ message: "You are not assigned to this course" });
      }
    }

    const normalizedMcqAnswers = typeof mcqAnswers === "object" && mcqAnswers ? mcqAnswers : {};
    const normalizedCodeAnswers = typeof codeAnswers === "object" && codeAnswers ? codeAnswers : {};
    const { mcqQuestions, codeQuestions } = flattenAssignmentQuestions(assignment);

    const details = [];
    let scoreCount = 0;
    let totalCount = 0;

    mcqQuestions.forEach((question) => {
      const passed = normalizedMcqAnswers[question.id] === question.correctOptionId;
      totalCount += 1;
      if (passed) scoreCount += 1;
      details.push({
        questionId: question.id,
        questionType: "mcq",
        passed,
        language: "",
        message: passed ? "Correct" : "Incorrect",
        score: passed ? 1 : 0,
        total: 1,
      });
    });

    for (const question of codeQuestions) {
      const lang = normalizeLanguage(question.language || assignment.language || "js");
      const submittedCode = String(normalizedCodeAnswers[question.id] || "").trim();

      if (!submittedCode) {
        details.push({
          questionId: question.id,
          questionType: "code",
          passed: false,
          language: lang,
          message: "No code submitted",
          score: 0,
          total: 1,
        });
        if (lang === "js" || lang === "javascript") {
          totalCount += 1;
        }
        continue;
      }

      if (lang !== "js" && lang !== "javascript") {
        details.push({
          questionId: question.id,
          questionType: "code",
          passed: false,
          language: lang,
          message: "Automatic scoring unavailable for selected language; requires teacher review",
          score: 0,
          total: 0,
        });
        continue;
      }

      const evaluation = await evaluateJavaScriptCode({
        code: submittedCode,
        functionName: "solve",
        testCases: Array.isArray(question.testCases) ? question.testCases : [],
      });

      totalCount += 1;
      if (evaluation.passed) scoreCount += 1;

      details.push({
        questionId: question.id,
        questionType: "code",
        passed: Boolean(evaluation.passed),
        language: lang,
        message: String(evaluation.message || ""),
        score: evaluation.passed ? 1 : 0,
        total: 1,
      });
    }

    const score = totalCount > 0 ? Math.round((scoreCount / totalCount) * 100) : 0;

    const previousAttempts = await AssignmentSubmission.countDocuments({
      assignmentId,
      studentEmail: normalizedEmail,
    });

    const attempt = await AssignmentSubmission.create({
      assignmentId,
      studentEmail: normalizedEmail,
      mcqAnswers: normalizedMcqAnswers,
      codeAnswers: normalizedCodeAnswers,
      score,
      total: totalCount,
      warningCount: Math.max(0, Number(warningCount) || 0),
      timeTakenSeconds: Math.max(0, Number(timeTakenSeconds) || 0),
      attemptNumber: previousAttempts + 1,
      details,
      submittedAt: new Date(),
    });

    const distinctSubmitters = await AssignmentSubmission.distinct("studentEmail", { assignmentId });
    const enrolledCount = await CollegeMember.countDocuments({ role: "student", course: assignment.course });
    const nextSubmissions = `${distinctSubmitters.length}/${Math.max(enrolledCount, distinctSubmitters.length)}`;

    await Assignment.updateOne({ id: assignmentId }, {
      $set: {
        submissions: nextSubmissions,
        status: "In Review",
      },
    });

    res.status(201).json({ data: attempt.toObject() });
  } catch {
    res.status(500).json({ message: "Failed to submit assignment attempt" });
  }
});

router.get("/:id/results", async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (Number.isNaN(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const teacherEmail = String(req.query.teacherEmail || "").trim().toLowerCase();
    const assignment = await Assignment.findOne({ id: assignmentId }).select("id title course teacherEmail");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (teacherEmail && assignment.teacherEmail !== teacherEmail) {
      return res.status(403).json({ message: "You cannot view results for this assignment" });
    }

    const course = await Course.findOne({ title: assignment.course }).select("id title");
    const enrolledRows = course ? await CourseEnrollment.find({ courseId: course.id }).select("studentEmail") : [];
    const rosterMembers = await CollegeMember.find({ role: "student", course: assignment.course }).select("name email regId");

    const rosterEmailSet = new Set();
    const rosterByEmail = new Map();

    rosterMembers.forEach((member) => {
      const email = String(member.email || "").trim().toLowerCase();
      if (!email) return;
      rosterEmailSet.add(email);
      rosterByEmail.set(email, {
        name: member.name,
        email,
        regId: member.regId,
      });
    });

    enrolledRows.forEach((row) => {
      const email = String(row.studentEmail || "").trim().toLowerCase();
      if (!email) return;
      rosterEmailSet.add(email);
      if (!rosterByEmail.has(email)) {
        rosterByEmail.set(email, {
          name: email.split("@")[0],
          email,
          regId: "",
        });
      }
    });

    const submissions = await AssignmentSubmission.find({ assignmentId }).sort({ submittedAt: -1 }).select("-__v");
    const attemptsByEmail = new Map();

    submissions.forEach((row) => {
      const email = String(row.studentEmail || "").trim().toLowerCase();
      if (!email) return;
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
    });

    const attempted = [];
    const pending = [];

    rosterEmailSet.forEach((email) => {
      const profile = rosterByEmail.get(email) || { name: email.split("@")[0], email, regId: "" };
      const rows = attemptsByEmail.get(email) || [];
      if (rows.length === 0) {
        pending.push(profile);
        return;
      }

      const latest = rows[0];
      const bestScore = rows.reduce((max, row) => Math.max(max, Number(row.score) || 0), 0);

      attempted.push({
        ...profile,
        attemptsCount: rows.length,
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
        assignment: {
          id: assignment.id,
          title: assignment.title,
          course: assignment.course,
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
    res.status(500).json({ message: "Failed to load assignment results" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      course,
      due,
      openDate = "",
      closeDate = "",
      submissions = "0/0",
      status = "Pending",
      teacherEmail = "teacher@edu.com",
      assignmentType = "mcq",
      language = "js",
      timeLimit = 0,
      sections = [],
      questions = [],
      mcqQuestion = "",
      options = [],
      correctOptionId = "",
      prompt = "",
      codeStarter = "",
      testCases = [],
      assignmentFileUrl = "",
      assignmentFileName = "",
      assignmentFileSize = "",
    } = req.body || {};

    if (!title || !course || !due) {
      return res.status(400).json({ message: "title, course and due are required" });
    }

    if (!["mcq", "code", "mixed"].includes(String(assignmentType))) {
      return res.status(400).json({ message: "assignmentType must be mcq, code or mixed" });
    }

    const normalizedLanguage = normalizeLanguage(language);
    if (!ALLOWED_LANGUAGES.includes(normalizedLanguage)) {
      return res.status(400).json({ message: "Unsupported language" });
    }

    const normalizedCourse = normalizeCourseName(course);
    const enrolledStudents = await CollegeMember.countDocuments({ role: "student", course: normalizedCourse });

    const assignmentPayload = {
      id: await nextAssignmentId(),
      title: String(title).trim(),
      course: normalizedCourse,
      due: String(due).trim(),
      openDate: String(openDate).trim(),
      closeDate: String(closeDate).trim(),
      submissions,
      status,
      teacherEmail: String(teacherEmail).toLowerCase(),
      assignmentType: String(assignmentType),
      language: normalizedLanguage,
      timeLimit: Number(timeLimit) || 0,
      sections: assignmentType === "mixed" ? normalizeSections(sections) : [],
      questions: assignmentType === "mcq" ? normalizeQuestions(questions) : [],
      mcqQuestion: assignmentType === "mcq" ? String(mcqQuestion || "").trim() : "",
      options: assignmentType === "mcq" ? normalizeMcqOptions(options) : [],
      correctOptionId: assignmentType === "mcq" ? String(correctOptionId || "").trim() : "",
      prompt: assignmentType === "code" ? String(prompt || "").trim() : "",
      codeStarter: assignmentType === "code" ? String(codeStarter || "").trim() : "",
      testCases: assignmentType === "code" ? normalizeTestCases(testCases) : [],
      assignmentFileUrl: normalizeAttachmentField(assignmentFileUrl),
      assignmentFileName: normalizeAttachmentField(assignmentFileName),
      assignmentFileSize: normalizeAttachmentField(assignmentFileSize),
    };

    if (assignmentType === "mcq") {
      if ((!assignmentPayload.mcqQuestion || assignmentPayload.options.length < 2 || !assignmentPayload.correctOptionId) && assignmentPayload.questions.length === 0) {
        return res.status(400).json({ message: "MCQ assignments require at least one valid question" });
      }
    }

    if (assignmentType === "code") {
      if (!assignmentPayload.prompt || !assignmentPayload.codeStarter || assignmentPayload.testCases.length === 0) {
        return res.status(400).json({ message: "Code assignments require prompt, starter code and test cases" });
      }
    }

    if (assignmentType === "mixed") {
      if (assignmentPayload.sections.length === 0) {
        return res.status(400).json({ message: "Mixed assignments require at least one valid section" });
      }
    }

    const assignment = await Assignment.create(assignmentPayload);

    res.status(201).json({ data: { ...(await buildAssignmentResponse(assignment)), enrolledStudents } });
  } catch (error) {
    const reason = String(error?.message || "").trim();
    res.status(500).json({ message: reason ? `Failed to create assignment: ${reason}` : "Failed to create assignment" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (Number.isNaN(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const updates = {};
    const allowedFields = [
      "title",
      "course",
      "due",
      "openDate",
      "closeDate",
      "submissions",
      "status",
      "teacherEmail",
      "assignmentType",
      "language",
      "timeLimit",
      "sections",
      "questions",
      "mcqQuestion",
      "options",
      "correctOptionId",
      "prompt",
      "codeStarter",
      "testCases",
      "assignmentFileUrl",
      "assignmentFileName",
      "assignmentFileSize",
    ];

    allowedFields.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        if (field === "teacherEmail") {
          updates[field] = String(req.body[field]).toLowerCase();
          return;
        }

        if (field === "course") {
          updates[field] = normalizeCourseName(req.body[field]);
          return;
        }

        if (field === "assignmentType") {
          updates[field] = String(req.body[field]);
          return;
        }

        if (field === "language") {
          updates[field] = String(req.body[field]).toLowerCase();
          return;
        }

        if (field === "timeLimit") {
          updates[field] = Number(req.body[field]) || 0;
          return;
        }

        if (field === "sections") {
          updates[field] = normalizeSections(req.body[field]);
          return;
        }

        if (field === "questions") {
          updates[field] = normalizeQuestions(req.body[field]);
          return;
        }

        if (field === "options") {
          updates[field] = normalizeMcqOptions(req.body[field]);
          return;
        }

        if (field === "testCases") {
          updates[field] = normalizeTestCases(req.body[field]);
          return;
        }

        if (field === "assignmentFileUrl" || field === "assignmentFileName" || field === "assignmentFileSize") {
          updates[field] = normalizeAttachmentField(req.body[field]);
          return;
        }

        updates[field] = req.body[field];
      }
    });

    const assignment = await Assignment.findOneAndUpdate({ id: assignmentId }, updates, { new: true }).select("-__v");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json({ data: await buildAssignmentResponse(assignment) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update assignment" });
  }
});

router.post("/compile", async (req, res) => {
  try {
    const { code, functionName, testCases = [], language = "js" } = req.body || {};

    if (String(language).toLowerCase() !== "js" && String(language).toLowerCase() !== "javascript") {
      return res.json({
        data: {
          passed: false,
          message: `Compiler preview is currently available for JavaScript only. Selected: ${language}`,
          results: [],
        },
      });
    }

    const result = await evaluateJavaScriptCode({ code, functionName, testCases });
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ message: "Failed to evaluate assignment code" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const assignmentId = Number(req.params.id);
    if (Number.isNaN(assignmentId)) {
      return res.status(400).json({ message: "Invalid assignment id" });
    }

    const deleted = await Assignment.findOneAndDelete({ id: assignmentId });
    if (!deleted) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    res.json({ data: { deleted: true, id: assignmentId } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete assignment" });
  }
});

export default router;




