import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { Resource } from "../models/Resource.js";
import { Course } from "../models/Course.js";
import { uploadBufferToCloudinary } from "../config/cloudinary.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

async function nextResourceId() {
  const latest = await Resource.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

async function uploadFileBufferWithFallback({ buffer, fileName, mimeType, folder = "resources" }) {
  try {
    const resourceType = mimeType.startsWith("image/") ? "image" : "raw";
    const uploadResult = await uploadBufferToCloudinary({
      buffer,
      fileName,
      folder,
      resourceType,
    });
    return { success: true, fileUrl: uploadResult.secure_url, source: "cloudinary" };
  } catch (cloudError) {
    console.warn("Cloudinary upload failed, using local fallback:", cloudError?.message);
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const safeName = `${folder.replace(/[^a-z0-9]/gi, "-")}-${timestamp}-${String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filePath = path.join(uploadsDir, safeName);

      fs.writeFileSync(filePath, buffer);

      return { success: true, fileUrl: `/uploads/${safeName}`, source: "local" };
    } catch (localError) {
      throw new Error(`Upload failed: ${localError?.message || "Unknown error"}`);
    }
  }
}


router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const mimeType = String(req.file.mimetype || "").toLowerCase();
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ message: "This file type is not supported" });
    }

    const folder = mimeType.startsWith("image/") ? "profile-and-images" : "resources";
    const uploadResult = await uploadFileBufferWithFallback({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      mimeType,
      folder,
    });

    res.json({
      data: {
        fileUrl: uploadResult.fileUrl,
        fileName: req.file.originalname,
        fileSize: (req.file.size / 1024 / 1024).toFixed(2) + " MB",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error?.message || "File upload failed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const { teacherEmail, course, status } = req.query;
    const query = {};

    if (teacherEmail) query.teacherEmail = String(teacherEmail).toLowerCase();
    if (status) query.status = String(status);
    
    if (course) {
      // If course is provided, we fetch resources for that specific course OR "All"
      query.$or = [
        { course: String(course) },
        { course: "All" }
      ];
    }

    const resources = await Resource.find(query).sort({ id: -1 }).select("-__v");
    res.json({ data: resources, total: resources.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch resources" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description = "",
      type = "document",
      fileUrl = "",
      linkUrl = "",
      fileName = "",
      fileSize = "",
      course,
      teacherEmail = "teacher@edu.com",
      status = "active",
    } = req.body || {};

    if (!title || !course) {
      return res.status(400).json({ message: "title and course are required" });
    }

    // Check if course is valid (either "All" or an approved course)
    if (course !== "All") {
      const selectedCourse = await Course.findOne({ title: String(course).trim(), status: "approved" });
      if (!selectedCourse) {
        return res.status(400).json({ message: "Selected course is not approved or does not exist" });
      }
    }

    const resource = await Resource.create({
      id: await nextResourceId(),
      title: String(title).trim(),
      description: String(description).trim(),
      type,
      fileUrl: String(fileUrl).trim(),
      linkUrl: String(linkUrl).trim(),
      fileName: String(fileName).trim(),
      fileSize: String(fileSize).trim(),
      course: String(course).trim(),
      teacherEmail: String(teacherEmail).toLowerCase(),
      status,
    });

    res.status(201).json({ data: resource });
  } catch (error) {
    res.status(500).json({ message: "Failed to create resource" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    if (Number.isNaN(resourceId)) {
      return res.status(400).json({ message: "Invalid resource id" });
    }

    const deleted = await Resource.findOneAndDelete({ id: resourceId });
    if (!deleted) {
      return res.status(404).json({ message: "Resource not found" });
    }

    res.json({ data: { deleted: true, id: resourceId } });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete resource" });
  }
});

export default router;
