import { Router } from "express";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { Course } from "../models/Course.js";
import { parseDataUriMime, uploadDataUriToCloudinary, uploadBufferToCloudinary } from "../config/cloudinary.js";

const router = Router();

function normalizeCollegeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePanelList(panels) {
  if (!Array.isArray(panels) || panels.length === 0) {
    return ["teacher"];
  }

  return panels.map((panel) => String(panel).trim().toLowerCase()).filter(Boolean);
}

function normalizeLectures(lecturesInput) {
  if (!Array.isArray(lecturesInput)) {
    return [];
  }

  return lecturesInput
    .map((lecture, lectureIndex) => {
      const lectureId = String(lecture?.id || `lec-${lectureIndex + 1}`).trim();
      const title = String(lecture?.title || "").trim();
      const summary = String(lecture?.summary || "").trim();

      if (!title) {
        return null;
      }

      const tests = Array.isArray(lecture?.tests)
        ? lecture.tests
          .map((test, testIndex) => {
            const testId = String(test?.id || `test-${lectureIndex + 1}-${testIndex + 1}`).trim();
            const testTitle = String(test?.title || "").trim();
            const type = test?.type === "code" ? "code" : "mcq";

            if (!testTitle) {
              return null;
            }

            if (type === "mcq") {
              const options = Array.isArray(test?.options)
                ? test.options
                  .map((option, optionIndex) => ({
                    id: String(option?.id || `opt-${optionIndex + 1}`).trim(),
                    text: String(option?.text || "").trim(),
                  }))
                  .filter((option) => option.id && option.text)
                : [];

              return {
                id: testId,
                title: testTitle,
                type,
                mcqQuestion: String(test?.mcqQuestion || "").trim(),
                options,
                correctOptionId: String(test?.correctOptionId || "").trim(),
                prompt: "",
                functionName: "",
                testCases: [],
              };
            }

            const testCases = Array.isArray(test?.testCases)
              ? test.testCases
                .map((testCase) => ({
                  input: String(testCase?.input || "").trim(),
                  expectedOutput: String(testCase?.expectedOutput || "").trim(),
                }))
                .filter((testCase) => testCase.input && testCase.expectedOutput)
              : [];

            return {
              id: testId,
              title: testTitle,
              type,
              mcqQuestion: "",
              options: [],
              correctOptionId: "",
              prompt: String(test?.prompt || "").trim(),
              functionName: String(test?.functionName || "").trim(),
              testCases,
            };
          })
          .filter(Boolean)
        : [];

      return {
        id: lectureId,
        title,
        summary,
        testTimeMinutes: Math.min(600, Math.max(1, Number(lecture?.testTimeMinutes || lecture?.testTime || 30) || 30)),
        documentUrl: String(lecture?.documentUrl || "").trim(),
        documentName: String(lecture?.documentName || "").trim(),
        modules: Array.isArray(lecture?.modules)
          ? lecture.modules.map((moduleItem, moduleIndex) => ({
            id: String(moduleItem?.id || `mod-${lectureIndex + 1}-${moduleIndex + 1}`).trim(),
            title: String(moduleItem?.title || "").trim() || `Module ${moduleIndex + 1}`,
            pdfUrl: String(moduleItem?.pdfUrl || "").trim(),
            pptUrl: String(moduleItem?.pptUrl || "").trim(),
            videoUrl: String(moduleItem?.videoUrl || "").trim(),
            notes: String(moduleItem?.notes || "").trim(),
          }))
          : [],
        tests,
      };
    })
    .filter(Boolean);
}

function normalizeUnits(unitsInput) {
  if (!Array.isArray(unitsInput)) {
    return [];
  }

  return unitsInput
    .map((unit, unitIndex) => {
      const unitId = String(unit?.id || `unit-${unitIndex + 1}`).trim();
      const title = String(unit?.title || "").trim();
      if (!title) {
        return null;
      }

      return {
        id: unitId,
        title,
        lectures: normalizeLectures(unit?.lectures || []),
      };
    })
    .filter(Boolean);
}

function parseCaseInput(inputText) {
  const trimmed = String(inputText || "").trim();

  if (!trimmed) {
    return [];
  }

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

function evaluateCodeSubmission({ code, functionName, testCases }) {
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

  const passed = results.every((result) => result.pass);
  return {
    passed,
    message: passed ? "All test cases passed" : "Some test cases failed",
    results,
  };
}

async function nextCourseId() {
  const latest = await Course.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

router.get("/metadata", async (req, res) => {
  try {
    const [categories, topics] = await Promise.all([
      Course.distinct("category", { status: "approved" }),
      Course.distinct("topic", { status: "approved" })
    ]);
    res.json({ data: { categories: categories.filter(Boolean), topics: topics.filter(Boolean) } });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch metadata" });
  }
});

async function uploadFileWithFallback({ dataUri, fileName, folder = "course-uploads" }) {
  try {
    console.log(`[Cloudinary] Starting upload: ${fileName} (Folder: ${folder})`);
    
    const upload = await uploadDataUriToCloudinary({
      dataUri,
      fileName,
      folder,
      resourceType: "auto"
    });
    
    console.log(`[Cloudinary] Success: ${upload.secure_url}`);
    return { success: true, fileUrl: upload.secure_url, source: "cloudinary" };
  } catch (cloudError) {
    console.error("[Cloudinary] Upload Failed. Full Error:", cloudError);
    console.warn("[Cloudinary] Falling back to local storage due to error:", cloudError?.message);
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const safeName = `${folder.replace(/[^a-z0-9]/gi, "-")}-${timestamp}-${String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filePath = path.join(uploadsDir, safeName);

      const base64Data = String(dataUri || "").split(",")[1] || dataUri;
      const buffer = Buffer.from(base64Data, "base64");
      fs.writeFileSync(filePath, buffer);

      const backendUrl = process.env.BACKEND_URL || "";
      const finalUrl = backendUrl ? `${backendUrl.replace(/\/$/, "")}/uploads/${safeName}` : `/uploads/${safeName}`;

      return { success: true, fileUrl: finalUrl, source: "local" };
    } catch (localError) {
      throw new Error(`Upload failed: ${localError?.message || "Unknown error"}`);
    }
  }
}

router.get("/", async (req, res) => {
  try {
    const { panel, category, difficulty, status } = req.query;
    const collegeEmail = String(req.query?.collegeEmail || "").trim().toLowerCase();
    const query = {};

    if (panel) {
      query.panels = panel;

      if (panel === "student") {
        query.status = "approved";
      }

      if (panel === "college") {
        query.status = "pending";
      }
    }

    if (status) {
      query.status = status;
    }

    if (collegeEmail) {
      query.collegeEmail = collegeEmail;
    }

    if (category) {
      query.category = category;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    const courses = await Course.find(query).sort({ id: 1 }).select("-__v");
    res.json({ data: courses, total: courses.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category = "General",
      difficulty = "Beginner",
      grade = "",
      topic = "",
      price = "Free",
      students = 0,
      progress = 0,
      icon = "📘",
      image = "",
      collegeEmail = "",
      panels = ["teacher"],
      units = [],
      lectures = [],
    } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ message: "title and description are required" });
    }

    const normalizedUnits = normalizeUnits(units);
    const fallbackUnits = normalizedUnits.length
      ? normalizedUnits
      : [
        {
          id: "unit-1",
          title: "Unit 1",
          lectures: normalizeLectures(lectures),
        },
      ];

    const normalizedIcon = String(icon).trim() || "📘";
    const normalizedImage = String(image).trim();
    const derivedImage = /^https?:\/\//i.test(normalizedIcon) ? normalizedIcon : "";

    const created = await Course.create({
      id: await nextCourseId(),
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      difficulty,
      rating: 0,
      reviews: "0",
      price: String(price || "Free").trim() || "Free",
      image: normalizedImage || derivedImage,
      badge: "",
      accessibilityTags: [],
      topic: String(topic).trim(),
      grade: String(grade).trim(),
      students: Number(students) || 0,
      progress: Number(progress) || 0,
      icon: normalizedIcon,
      collegeEmail: String(collegeEmail || "").trim().toLowerCase(),
      panels: normalizePanelList(panels),
      units: fallbackUnits,
      status: "pending",
      createdBy: String(req.body?.createdBy || req.body?.collegeEmail || "teacher@edu.com").toLowerCase().trim(),
    });

    res.status(201).json({ data: created });
  } catch (error) {
    res.status(500).json({ message: "Failed to create course" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    if (Number.isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course id" });
    }

    const updates = {};
    const scalarFields = ["title", "description", "category", "difficulty", "topic", "grade", "students", "progress", "icon", "image", "price", "collegeEmail"];

    scalarFields.forEach((field) => {
      if (req.body?.[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.body?.panels !== undefined) {
      updates.panels = normalizePanelList(req.body.panels);
    }

    if (updates.icon !== undefined && updates.image === undefined) {
      const nextIcon = String(updates.icon || "").trim();
      if (/^https?:\/\//i.test(nextIcon)) {
        updates.image = nextIcon;
      }
    }

    if (req.body?.units !== undefined) {
      updates.units = normalizeUnits(req.body.units);
    }

    if (req.body?.lectures !== undefined && req.body?.units === undefined) {
      updates.units = [
        {
          id: "unit-1",
          title: "Unit 1",
          lectures: normalizeLectures(req.body.lectures),
        },
      ];
    }

    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail || req.body?.collegeEmail);
    const filter = { id: courseId };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const updated = await Course.findOneAndUpdate(filter, updates, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!updated) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update course" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    if (Number.isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course id" });
    }

    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail);
    const filter = { id: courseId };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const deleted = await Course.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ data: { deleted: true, id: courseId } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete course" });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const { status } = req.body || {};

    if (Number.isNaN(courseId)) {
      return res.status(400).json({ message: "Invalid course id" });
    }

    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be pending, approved, or rejected" });
    }

    const collegeEmail = normalizeCollegeEmail(req.query?.collegeEmail || req.body?.collegeEmail);
    const filter = { id: courseId };
    if (collegeEmail) filter.collegeEmail = collegeEmail;

    const updated = await Course.findOneAndUpdate(filter, { status }, { new: true, runValidators: true }).select("-__v");

    if (!updated) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update course status" });
  }
});

router.post("/compile", async (req, res) => {
  try {
    const { code, functionName, testCases } = req.body || {};
    const result = evaluateCodeSubmission({ code, functionName, testCases });
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ message: "Failed to evaluate code" });
  }
});

router.post("/:id/lectures/:lectureId/tests/:testId/submit", async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const { lectureId, testId } = req.params;
    const { code } = req.body || {};

    if (Number.isNaN(courseId) || !lectureId || !testId || !code) {
      return res.status(400).json({ message: "Invalid submit payload" });
    }

    const course = await Course.findOne({ id: courseId }).select("id title units");
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const allLectures = (course.units || []).flatMap((unit) => unit.lectures || []);
    const lecture = allLectures.find((item) => item.id === lectureId);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    const test = lecture.tests.find((item) => item.id === testId && item.type === "code");
    if (!test) {
      return res.status(404).json({ message: "Code test not found" });
    }

    const result = evaluateCodeSubmission({
      code,
      functionName: test.functionName,
      testCases: test.testCases,
    });

    res.json({
      data: {
        courseId,
        lectureId,
        testId,
        ...result,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to evaluate submission" });
  }
});

router.post("/uploads/lecture-document", async (req, res) => {
  try {
    const { fileName, fileData } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ message: "fileName and fileData are required" });
    }

    const mimeType = parseDataUriMime(fileData);
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/gif",
      "image/svg+xml",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "audio/mp4",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
    ];

    if (mimeType === "application/vnd.ms-powerpoint") {
      return res.status(400).json({
        message: "Legacy .ppt files are not supported for reliable inline preview. Please upload .pptx or .pdf.",
      });
    }

    if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ message: "File type not allowed for upload" });
    }

    const folder = mimeType.startsWith("image/") ? "course-images" : "course-documents";

    const upload = await uploadFileWithFallback({
      dataUri: fileData,
      fileName,
      folder,
    });

    res.json({
      data: {
        success: upload.success,
        fileUrl: upload.fileUrl,
        fileName,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error?.message || "Failed to process file upload" });
  }
});

export default router;
