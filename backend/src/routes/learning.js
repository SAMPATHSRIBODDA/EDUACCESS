import { Router } from "express";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import Razorpay from "razorpay";
import { Course } from "../models/Course.js";
import { CourseEnrollment } from "../models/CourseEnrollment.js";
import { CourseProgress } from "../models/CourseProgress.js";
import { TestSubmission } from "../models/TestSubmission.js";

const router = Router();
const RAZORPAY_KEY_ID = String(process.env.RAZORPAY_KEY_ID || "").trim();
const RAZORPAY_KEY_SECRET = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

const razorpayClient = RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

const MAX_SOURCE_LENGTH = 20000;
const UNSAFE_PATTERNS = [
  /process\./i,
  /require\s*\(/i,
  /child_process/i,
  /fs\./i,
  /while\s*\(\s*true\s*\)/i,
  /for\s*\(\s*;\s*;\s*\)/i,
  /import\s+os/i,
  /import\s+subprocess/i,
  /system\s*\(/i,
  /popen\s*\(/i,
  /fork\s*\(/i,
];

function validateCodeSafety(code) {
  const source = String(code || "");
  if (!source.trim()) {
    return { ok: false, message: "Source code is required" };
  }

  if (source.length > MAX_SOURCE_LENGTH) {
    return { ok: false, message: `Source code exceeds ${MAX_SOURCE_LENGTH} characters limit` };
  }

  const matched = UNSAFE_PATTERNS.find((pattern) => pattern.test(source));
  if (matched) {
    return { ok: false, message: "Potentially unsafe code pattern detected" };
  }

  return { ok: true, message: "ok" };
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

function tryParseExpected(expectedOutput) {
  const text = String(expectedOutput || "").trim();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function evaluateJavascriptCode({ code, functionName, testCases }) {
  const safety = validateCodeSafety(code);
  if (!safety.ok) {
    return {
      passed: false,
      message: safety.message,
      results: [],
    };
  }

  if (!code || !functionName || !Array.isArray(testCases) || testCases.length === 0) {
    return {
      passed: false,
      message: "code, functionName and testCases are required",
      results: [],
    };
  }

  const wrappedCode = `"use strict";\n${code}`;
  const context = vm.createContext({});
  new vm.Script(wrappedCode).runInContext(context, { timeout: 1000 });

  const candidate = context[functionName];
  if (typeof candidate !== "function") {
    return {
      passed: false,
      message: `Function ${functionName} was not found in submitted code`,
      results: [],
    };
  }

  const results = testCases.map((testCase) => {
    const args = parseCaseInput(testCase.input);
    const expected = tryParseExpected(testCase.expectedOutput);

    try {
      const actual = candidate(...args);
      const pass = JSON.stringify(actual) === JSON.stringify(expected);
      return {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: JSON.stringify(actual),
        pass,
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

  return {
    passed: results.every((result) => result.pass),
    message: results.every((result) => result.pass) ? "All test cases passed" : "Some test cases failed",
    results,
  };
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeout || 3000);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", reject);

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        return reject(new Error("Execution timed out"));
      }
      if (code !== 0) {
        return reject(new Error(stderr || `Process exited with code ${code}`));
      }
      resolve({ stdout, stderr });
    });

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

async function detectCommand(command, args = ["--version"]) {
  try {
    await runProcess(command, args, { timeout: 1500 });
    return true;
  } catch {
    return false;
  }
}

async function evaluatePythonCode({ code, functionName, testCases }) {
  const safety = validateCodeSafety(code);
  if (!safety.ok) {
    return {
      passed: false,
      message: safety.message,
      results: [],
    };
  }

  const hasPython = (await detectCommand("python")) || (await detectCommand("py", ["-V"]));
  if (!hasPython) {
    return {
      passed: false,
      message: "Python runtime not available on server",
      results: [],
    };
  }

  const command = (await detectCommand("python")) ? "python" : "py";
  const dir = await mkdtemp(path.join(os.tmpdir(), "edu-python-"));
  const file = path.join(dir, "runner.py");

  const script = `import json\nimport sys\n${code}\n\ndef __run():\n    tests = json.loads(sys.argv[1])\n    fn_name = sys.argv[2]\n    fn = globals().get(fn_name)\n    if not callable(fn):\n        print(json.dumps({"error": f"Function {fn_name} not found", "results": []}))\n        return\n\n    out = []\n    for t in tests:\n        inp = str(t.get("input", "")).strip()\n        exp = str(t.get("expectedOutput", "")).strip()\n        try:\n            parsed = json.loads(inp)\n            args = parsed if isinstance(parsed, list) else [parsed]\n        except Exception:\n            args = [inp]\n\n        try:\n            actual = fn(*args)\n            actual_out = json.dumps(actual, separators=(",", ":"))\n        except Exception as e:\n            actual_out = str(e)\n\n        out.append({\n            "input": inp,\n            "expectedOutput": exp,\n            "actualOutput": actual_out,\n            "pass": actual_out == exp\n        })\n\n    print(json.dumps({"results": out}))\n\nif __name__ == "__main__":\n    __run()\n`;

  try {
    await writeFile(file, script, "utf8");
    const response = await runProcess(command, [file, JSON.stringify(testCases || []), String(functionName || "solve")], { timeout: 4000 });
    const parsed = JSON.parse(String(response.stdout || "{}"));
    const results = Array.isArray(parsed.results) ? parsed.results : [];
    const passed = results.length > 0 && results.every((item) => item.pass);
    return {
      passed,
      message: passed ? "All test cases passed" : parsed.error || "Some test cases failed",
      results,
    };
  } catch (error) {
    return {
      passed: false,
      message: String(error?.message || "Python execution failed"),
      results: [],
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function evaluateCppCode({ code, testCases }) {
  const safety = validateCodeSafety(code);
  if (!safety.ok) {
    return {
      passed: false,
      message: safety.message,
      results: [],
    };
  }

  const hasGpp = await detectCommand("g++", ["--version"]);
  if (!hasGpp) {
    return {
      passed: false,
      message: "C++ runtime not available on server",
      results: [],
    };
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "edu-cpp-"));
  const srcFile = path.join(dir, "main.cpp");
  const exeFile = path.join(dir, process.platform === "win32" ? "app.exe" : "app");

  try {
    await writeFile(srcFile, String(code || ""), "utf8");
    await runProcess("g++", [srcFile, "-O2", "-std=c++17", "-o", exeFile], { timeout: 7000 });

    const results = [];
    for (const testCase of testCases || []) {
      try {
        const output = await runProcess(exeFile, [], {
          timeout: 3000,
          input: String(testCase?.input || ""),
        });

        const actual = String(output.stdout || "").trim();
        const expected = String(testCase?.expectedOutput || "").trim();
        results.push({
          input: String(testCase?.input || ""),
          expectedOutput: expected,
          actualOutput: actual,
          pass: actual === expected,
        });
      } catch (error) {
        results.push({
          input: String(testCase?.input || ""),
          expectedOutput: String(testCase?.expectedOutput || ""),
          actualOutput: String(error?.message || "Runtime error"),
          pass: false,
        });
      }
    }

    const passed = results.length > 0 && results.every((item) => item.pass);
    return {
      passed,
      message: passed ? "All test cases passed" : "Some test cases failed",
      results,
    };
  } catch (error) {
    return {
      passed: false,
      message: String(error?.message || "C++ execution failed"),
      results: [],
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function evaluateCodeByLanguage({ code, functionName, testCases, language }) {
  const normalized = String(language || "js").toLowerCase();
  if (normalized === "js" || normalized === "javascript") {
    return evaluateJavascriptCode({ code, functionName, testCases });
  }
  if (normalized === "py" || normalized === "python") {
    return evaluatePythonCode({ code, functionName, testCases });
  }
  if (normalized === "cpp" || normalized === "c++") {
    return evaluateCppCode({ code, testCases });
  }

  return {
    passed: false,
    message: `Unsupported language runtime: ${language}`,
    results: [],
  };
}

function mapCourseWithTeacherName(courseDoc) {
  const course = courseDoc.toObject();
  return {
    ...course,
    teacherName: String(course.createdBy || "teacher@edu.com"),
  };
}

function flattenLectures(course) {
  const units = Array.isArray(course.units) ? course.units : [];
  const out = [];

  units.forEach((unit) => {
    const lectures = Array.isArray(unit.lectures) ? unit.lectures : [];
    lectures.forEach((lecture) => {
      out.push({ unitId: unit.id, unitTitle: unit.title, lecture });
    });
  });

  return out;
}

function deriveModules(lecture) {
  const modules = Array.isArray(lecture.modules) ? lecture.modules : [];
  if (modules.length > 0) return modules;

  return [
    {
      id: `${lecture.id}-module-1`,
      title: lecture.title,
      pdfUrl: lecture.documentUrl || "",
      pptUrl: "",
      videoUrl: "",
      notes: lecture.summary || "",
    },
  ];
}

function buildProgressMetrics(course, progressDoc) {
  const lectures = flattenLectures(course);
  const totalLectures = lectures.length;
  const totalModules = lectures.reduce((sum, item) => sum + deriveModules(item.lecture).length, 0);

  const completedLectureIds = progressDoc?.completedLectureIds || [];
  const completedModuleIds = progressDoc?.completedModuleIds || [];

  const completedLectures = completedLectureIds.length;
  const completedModules = completedModuleIds.length;

  const lecturePercent = totalLectures ? Math.round((completedLectures / totalLectures) * 100) : 0;
  const modulePercent = totalModules ? Math.round((completedModules / totalModules) * 100) : 0;

  const expectedTopicSeconds = lectures.reduce((sum, item) => {
    const minutes = Math.min(600, Math.max(1, Number(item.lecture?.testTimeMinutes || 30) || 30));
    return sum + minutes * 60;
  }, 0);

  const topicDurations = Array.isArray(progressDoc?.topicDurations) ? progressDoc.topicDurations : [];
  const topicTimeSpentSeconds = topicDurations.reduce((sum, row) => sum + (Number(row?.secondsSpent) || 0), 0);
  const topicTimePercent = expectedTopicSeconds
    ? Math.min(100, Math.round((topicTimeSpentSeconds / expectedTopicSeconds) * 100))
    : 0;

  const topicTimeByLecture = topicDurations.reduce((acc, row) => {
    const lectureId = String(row?.lectureId || "").trim();
    if (!lectureId) return acc;
    acc[lectureId] = Number(row?.secondsSpent) || 0;
    return acc;
  }, {});

  return {
    totalLectures,
    totalModules,
    completedLectures,
    completedModules,
    lecturePercent,
    modulePercent,
    expectedTopicSeconds,
    topicTimeSpentSeconds,
    topicTimePercent,
    topicTimeByLecture,
  };
}

function isFreePriceTag(priceValue) {
  const normalized = String(priceValue || "").trim().toLowerCase();
  return !normalized || normalized === "free" || normalized === "0" || normalized === "₹0";
}

function parsePriceToPaise(priceValue) {
  const raw = String(priceValue || "").trim();
  const numeric = Number(raw.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }
  return Math.round(numeric * 100);
}

async function enrollStudentInCourse({ studentEmail, courseId, payment = {} }) {
  const existing = await CourseEnrollment.findOne({ studentEmail, courseId }).select("_id");

  const enrollment = await CourseEnrollment.findOneAndUpdate(
    { studentEmail, courseId },
    {
      $set: {
        lastAccessedAt: new Date(),
        paymentStatus: payment.paymentStatus || "free",
        amountPaid: Number(payment.amountPaid) || 0,
        currency: String(payment.currency || "INR"),
        paymentOrderId: String(payment.paymentOrderId || ""),
        paymentId: String(payment.paymentId || ""),
        paymentSignature: String(payment.paymentSignature || ""),
      },
      $setOnInsert: { enrolledAt: new Date() },
    },
    { upsert: true, new: true }
  );

  if (!existing) {
    await Course.findOneAndUpdate({ id: courseId }, { $inc: { students: 1 } });
  }

  return enrollment;
}

async function touchLearningEnrollment({ studentEmail, courseId }) {
  const existing = await CourseEnrollment.findOne({ studentEmail, courseId }).select("_id");
  if (existing) {
    await CourseEnrollment.findOneAndUpdate({ studentEmail, courseId }, { $set: { lastAccessedAt: new Date() } });
    return;
  }

  const course = await Course.findOne({ id: courseId, status: "approved" }).select("price");
  if (!course) {
    throw new Error("Course not found");
  }

  if (!isFreePriceTag(course.price)) {
    throw new Error("ENROLLMENT_REQUIRED_FOR_PAID_COURSE");
  }

  await enrollStudentInCourse({
    studentEmail,
    courseId,
    payment: {
      paymentStatus: "free",
      amountPaid: 0,
      currency: "INR",
    },
  });
}

router.get("/course/:id", async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const studentEmail = String(req.query.studentEmail || "").toLowerCase();

    if (Number.isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course id" });
    }

    const courseDoc = await Course.findOne({ id: courseId, status: "approved" }).select("-__v");
    if (!courseDoc) {
      return res.status(404).json({ message: "Course not found" });
    }

    const progressDoc = studentEmail
      ? await CourseProgress.findOne({ studentEmail, courseId }).select("-__v")
      : null;

    const course = mapCourseWithTeacherName(courseDoc);
    const enrollment = studentEmail
      ? await CourseEnrollment.findOne({ studentEmail, courseId }).select("_id")
      : null;
    const progress = buildProgressMetrics(course, progressDoc);

    res.json({
      data: {
        course,
        progress,
        enrolled: Boolean(enrollment),
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch course detail" });
  }
});

router.get("/lecture/:id", async (req, res) => {
  try {
    const lectureId = String(req.params.id || "").trim();
    const studentEmail = String(req.query.studentEmail || "").toLowerCase();

    if (!lectureId) {
      return res.status(400).json({ message: "Lecture id is required" });
    }

    const courses = await Course.find({ status: "approved" }).select("id title units createdBy status");

    let located = null;
    for (const courseDoc of courses) {
      const course = courseDoc.toObject();
      const lectures = flattenLectures(course);
      const found = lectures.find((item) => item.lecture.id === lectureId);
      if (found) {
        located = {
          courseId: course.id,
          courseTitle: course.title,
          unitId: found.unitId,
          unitTitle: found.unitTitle,
          lecture: found.lecture,
        };
        break;
      }
    }

    if (!located) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    const progressDoc = studentEmail
      ? await CourseProgress.findOne({ studentEmail, courseId: located.courseId }).select("completedLectureIds completedModuleIds")
      : null;

    const completedLectureIds = progressDoc?.completedLectureIds || [];
    const completedModuleIds = progressDoc?.completedModuleIds || [];

    res.json({
      data: {
        ...located,
        lecture: {
          ...located.lecture,
          modules: deriveModules(located.lecture),
        },
        completed: {
          lecture: completedLectureIds.includes(lectureId),
          modules: completedModuleIds,
        },
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to fetch lecture" });
  }
});

router.post("/progress/mark-module", async (req, res) => {
  try {
    const { studentEmail, courseId, lectureId, moduleId } = req.body || {};

    if (!studentEmail || !courseId || !lectureId || !moduleId) {
      return res.status(400).json({ message: "studentEmail, courseId, lectureId and moduleId are required" });
    }

    const normalizedEmail = String(studentEmail).toLowerCase().trim();
    const numericCourseId = Number(courseId);

    if (!normalizedEmail || Number.isNaN(numericCourseId)) {
      return res.status(400).json({ message: "Invalid progress payload" });
    }

    const updated = await CourseProgress.findOneAndUpdate(
      { studentEmail: normalizedEmail, courseId: numericCourseId },
      {
        $addToSet: {
          completedLectureIds: String(lectureId),
          completedModuleIds: String(moduleId),
        },
      },
      { new: true, upsert: true }
    );

    try {
      await touchLearningEnrollment({ studentEmail: normalizedEmail, courseId: numericCourseId });
    } catch (error) {
      if (String(error?.message || "") === "ENROLLMENT_REQUIRED_FOR_PAID_COURSE") {
        return res.status(403).json({ message: "Paid course enrollment required before tracking progress." });
      }
      throw error;
    }

    res.json({ data: updated });
  } catch {
    res.status(500).json({ message: "Failed to update module progress" });
  }
});

router.post("/progress/mark-lecture", async (req, res) => {
  try {
    const { studentEmail, courseId, lectureId } = req.body || {};

    if (!studentEmail || !courseId || !lectureId) {
      return res.status(400).json({ message: "studentEmail, courseId and lectureId are required" });
    }

    const normalizedEmail = String(studentEmail).toLowerCase().trim();
    const numericCourseId = Number(courseId);

    if (!normalizedEmail || Number.isNaN(numericCourseId)) {
      return res.status(400).json({ message: "Invalid progress payload" });
    }

    const updated = await CourseProgress.findOneAndUpdate(
      { studentEmail: normalizedEmail, courseId: numericCourseId },
      {
        $addToSet: {
          completedLectureIds: String(lectureId),
        },
      },
      { new: true, upsert: true }
    );

    try {
      await touchLearningEnrollment({ studentEmail: normalizedEmail, courseId: numericCourseId });
    } catch (error) {
      if (String(error?.message || "") === "ENROLLMENT_REQUIRED_FOR_PAID_COURSE") {
        return res.status(403).json({ message: "Paid course enrollment required before tracking progress." });
      }
      throw error;
    }

    res.json({ data: updated });
  } catch {
    res.status(500).json({ message: "Failed to update lecture progress" });
  }
});

router.post("/progress/topic-time", async (req, res) => {
  try {
    const { studentEmail, courseId, lectureId, secondsSpent } = req.body || {};

    if (!studentEmail || !courseId || !lectureId || secondsSpent === undefined) {
      return res.status(400).json({ message: "studentEmail, courseId, lectureId and secondsSpent are required" });
    }

    const normalizedEmail = String(studentEmail).toLowerCase().trim();
    const numericCourseId = Number(courseId);
    const normalizedLectureId = String(lectureId).trim();
    const delta = Math.max(0, Number(secondsSpent) || 0);

    if (!normalizedEmail || Number.isNaN(numericCourseId) || !normalizedLectureId) {
      return res.status(400).json({ message: "Invalid topic timer payload" });
    }

    let progressDoc = await CourseProgress.findOne({ studentEmail: normalizedEmail, courseId: numericCourseId });
    if (!progressDoc) {
      progressDoc = await CourseProgress.create({
        studentEmail: normalizedEmail,
        courseId: numericCourseId,
        completedLectureIds: [],
        completedModuleIds: [],
        testScores: [],
        topicDurations: [],
      });
    }

    const topicDurations = Array.isArray(progressDoc.topicDurations) ? progressDoc.topicDurations : [];
    const existingIndex = topicDurations.findIndex((row) => String(row?.lectureId || "") === normalizedLectureId);

    if (existingIndex >= 0) {
      topicDurations[existingIndex].secondsSpent = (Number(topicDurations[existingIndex].secondsSpent) || 0) + delta;
      topicDurations[existingIndex].updatedAt = new Date();
    } else {
      topicDurations.push({
        lectureId: normalizedLectureId,
        secondsSpent: delta,
        updatedAt: new Date(),
      });
    }

    progressDoc.topicDurations = topicDurations;
    await progressDoc.save();

    try {
      await touchLearningEnrollment({ studentEmail: normalizedEmail, courseId: numericCourseId });
    } catch (error) {
      if (String(error?.message || "") === "ENROLLMENT_REQUIRED_FOR_PAID_COURSE") {
        return res.status(403).json({ message: "Paid course enrollment required before tracking topic time." });
      }
      throw error;
    }

    res.json({ data: progressDoc });
  } catch {
    res.status(500).json({ message: "Failed to update topic timer" });
  }
});

router.post("/code/run", async (req, res) => {
  try {
    const { code, functionName = "solve", testCases = [], language = "js" } = req.body || {};
    const result = await evaluateCodeByLanguage({ code, functionName, testCases, language });
    res.json({ data: result });
  } catch {
    res.status(500).json({ message: "Failed to run code" });
  }
});

router.post("/test/submit", async (req, res) => {
  try {
    const {
      studentEmail,
      courseId,
      lectureId,
      testId,
      answers = {},
      code = "",
      language = "js",
      warningCount = 0,
      timeTakenSeconds = 0,
    } = req.body || {};

    if (!studentEmail || !courseId || !lectureId || !testId) {
      return res.status(400).json({ message: "studentEmail, courseId, lectureId and testId are required" });
    }

    const numericCourseId = Number(courseId);
    if (Number.isNaN(numericCourseId)) {
      return res.status(400).json({ message: "Invalid courseId" });
    }

    const courseDoc = await Course.findOne({ id: numericCourseId, status: "approved" }).select("id units");
    if (!courseDoc) {
      return res.status(404).json({ message: "Course not found" });
    }

    const course = courseDoc.toObject();
    const lectureEntry = flattenLectures(course).find((item) => item.lecture.id === String(lectureId));
    if (!lectureEntry) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    const test = (Array.isArray(lectureEntry.lecture.tests) ? lectureEntry.lecture.tests : []).find((item) => item.id === String(testId));
    if (!test) {
      return res.status(404).json({ message: "Test not found" });
    }

    let result = {
      score: 0,
      total: 1,
      passed: false,
      details: [],
    };

    if (test.type === "mcq") {
      const selectedOptionId = String(answers?.selectedOptionId || "");
      const isCorrect = selectedOptionId && selectedOptionId === String(test.correctOptionId || "");
      const options = Array.isArray(test.options) ? test.options : [];
      const selectedOptionText = options.find((option) => option.id === selectedOptionId)?.text || "";
      const correctOptionText = options.find((option) => option.id === String(test.correctOptionId || ""))?.text || "";
      result = {
        score: isCorrect ? 1 : 0,
        total: 1,
        passed: Boolean(isCorrect),
        details: [
          {
            question: test.mcqQuestion,
            selectedOptionId,
            selectedOptionText,
            correctOptionId: test.correctOptionId,
            correctOptionText,
            isCorrect,
          },
        ],
      };
    }

    if (test.type === "code") {
      const runResult = await evaluateCodeByLanguage({
        code,
        functionName: test.functionName || "solve",
        testCases: test.testCases || [],
        language: language || test.language || "js",
      });

      const passedCases = runResult.results.filter((item) => item.pass).length;
      result = {
        score: passedCases,
        total: runResult.results.length || 1,
        passed: runResult.passed,
        details: runResult.results,
      };
    }

    const submission = await TestSubmission.create({
      studentEmail: String(studentEmail).toLowerCase().trim(),
      courseId: numericCourseId,
      lectureId: String(lectureId),
      testId: String(testId),
      testType: test.type,
      language: String(language || test.language || "js"),
      answers,
      code: String(code || ""),
      warningCount: Math.max(0, Number(warningCount) || 0),
      timeTakenSeconds: Math.max(0, Number(timeTakenSeconds) || 0),
      result,
      submittedAt: new Date(),
    });

    await CourseProgress.findOneAndUpdate(
      { studentEmail: String(studentEmail).toLowerCase().trim(), courseId: numericCourseId },
      {
        $addToSet: {
          completedLectureIds: String(lectureId),
          testScores: {
            lectureId: String(lectureId),
            testId: String(testId),
            score: result.score,
            total: result.total,
            submittedAt: new Date(),
          },
        },
      },
      { upsert: true, new: true }
    );

    try {
      await touchLearningEnrollment({
        studentEmail: String(studentEmail).toLowerCase().trim(),
        courseId: numericCourseId,
      });
    } catch (error) {
      if (String(error?.message || "") === "ENROLLMENT_REQUIRED_FOR_PAID_COURSE") {
        return res.status(403).json({ message: "Paid course enrollment required before submitting tests." });
      }
      throw error;
    }

    res.json({
      data: {
        submissionId: submission._id,
        ...result,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to submit test" });
  }
});

router.get("/test/submissions", async (req, res) => {
  try {
    const studentEmail = String(req.query.studentEmail || "").toLowerCase().trim();
    const courseId = Number(req.query.courseId);

    if (!studentEmail || Number.isNaN(courseId)) {
      return res.status(400).json({ message: "studentEmail and courseId are required" });
    }

    const submissions = await TestSubmission.find({ studentEmail, courseId }).sort({ submittedAt: -1 }).limit(50).select("-__v");
    res.json({ data: submissions, total: submissions.length });
  } catch {
    res.status(500).json({ message: "Failed to load test submissions" });
  }
});

router.get("/enrollments", async (req, res) => {
  try {
    const studentEmail = String(req.query.studentEmail || "").toLowerCase().trim();
    if (!studentEmail) {
      return res.status(400).json({ message: "studentEmail is required" });
    }

    const enrollments = await CourseEnrollment.find({ studentEmail }).sort({ enrolledAt: -1 }).select("-__v");
    res.json({ data: enrollments, total: enrollments.length });
  } catch {
    res.status(500).json({ message: "Failed to fetch enrollments" });
  }
});

router.post("/enrollments/enroll", async (req, res) => {
  try {
    const studentEmail = String(req.body?.studentEmail || "").toLowerCase().trim();
    const courseId = Number(req.body?.courseId);
    if (!studentEmail || Number.isNaN(courseId)) {
      return res.status(400).json({ message: "studentEmail and courseId are required" });
    }

    const course = await Course.findOne({ id: courseId, status: "approved" }).select("id price title");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (!isFreePriceTag(course.price)) {
      return res.status(402).json({ message: "This is a paid course. Complete payment before enrolling." });
    }

    const enrollment = await enrollStudentInCourse({
      studentEmail,
      courseId,
      payment: {
        paymentStatus: "free",
        amountPaid: 0,
        currency: "INR",
      },
    });

    res.json({ data: enrollment });
  } catch {
    res.status(500).json({ message: "Failed to enroll" });
  }
});

router.post("/payments/razorpay/order", async (req, res) => {
  try {
    const studentEmail = String(req.body?.studentEmail || "").toLowerCase().trim();
    const courseId = Number(req.body?.courseId);

    if (!studentEmail || Number.isNaN(courseId)) {
      return res.status(400).json({ message: "studentEmail and courseId are required" });
    }

    const course = await Course.findOne({ id: courseId, status: "approved" }).select("id title price");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (isFreePriceTag(course.price)) {
      return res.status(400).json({ message: "This course is free. Use direct enrollment." });
    }

    if (!razorpayClient) {
      return res.status(500).json({ message: "Razorpay is not configured on server." });
    }

    const amount = parsePriceToPaise(course.price);
    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid paid course price." });
    }

    const order = await razorpayClient.orders.create({
      amount,
      currency: "INR",
      receipt: `course-${courseId}-${Date.now()}`,
      notes: {
        studentEmail,
        courseId: String(courseId),
        courseTitle: String(course.title || ""),
      },
    });

    res.json({
      data: {
        keyId: RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        courseId,
        courseTitle: course.title,
      },
    });
  } catch {
    res.status(500).json({ message: "Failed to create payment order" });
  }
});

router.post("/payments/razorpay/verify", async (req, res) => {
  try {
    const studentEmail = String(req.body?.studentEmail || "").toLowerCase().trim();
    const courseId = Number(req.body?.courseId);
    const razorpayOrderId = String(req.body?.razorpayOrderId || "").trim();
    const razorpayPaymentId = String(req.body?.razorpayPaymentId || "").trim();
    const razorpaySignature = String(req.body?.razorpaySignature || "").trim();

    if (!studentEmail || Number.isNaN(courseId) || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Invalid payment verification payload" });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ message: "Razorpay secret is missing on server." });
    }

    const course = await Course.findOne({ id: courseId, status: "approved" }).select("id title price");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (isFreePriceTag(course.price)) {
      return res.status(400).json({ message: "This course is free. Use direct enrollment." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const amountPaid = parsePriceToPaise(course.price) / 100;

    const enrollment = await enrollStudentInCourse({
      studentEmail,
      courseId,
      payment: {
        paymentStatus: "paid",
        amountPaid,
        currency: "INR",
        paymentOrderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        paymentSignature: razorpaySignature,
      },
    });

    res.json({ data: enrollment, message: "Payment verified and enrollment completed." });
  } catch {
    res.status(500).json({ message: "Failed to verify payment" });
  }
});

export default router;
