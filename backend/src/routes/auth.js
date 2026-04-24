import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { CollegeApplication } from "../models/CollegeApplication.js";
import { CollegeMember } from "../models/CollegeMember.js";
import { User } from "../models/User.js";

const router = Router();

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return null;
  }
  return new OAuth2Client(clientId);
};

async function nextUserId() {
  const latest = await User.findOne().sort({ id: -1 }).select("id");
  return latest ? latest.id + 1 : 1;
}

/**
 * POST /api/auth/google-login
 * Verify Google token and authenticate user
 * Body: { googleToken: string }
 */
router.post("/google-login", async (req, res) => {
  try {
    const googleToken = String(req.body?.googleToken || req.body?.credential || "").trim();

    if (!googleToken) {
      return res.status(400).json({ message: "Google token is required" });
    }

    const googleClient = getGoogleClient();
    if (!googleClient || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ message: "GOOGLE_CLIENT_ID is not configured on backend" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload?.email_verified) {
      return res.status(401).json({ message: "Invalid Google account", authorized: false });
    }

    const email = payload.email.toLowerCase();

    // Super-admin approved college owners get direct college-admin access.
    let collegeOwner = await User.findOne({
      email,
      role: "college",
      status: "active",
    });

    if (!collegeOwner) {
      const approvedApplication = await CollegeApplication.findOne({
        ownerEmail: email,
        status: "approved",
      }).sort({ reviewedAt: -1, id: -1 });

      if (approvedApplication) {
        let existingUser = await User.findOne({ email });

        if (!existingUser) {
          existingUser = await User.create({
            id: await nextUserId(),
            name: approvedApplication.collegeName,
            email,
            role: "college",
            status: "active",
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(approvedApplication.collegeName)}`,
            regId: `CLG-${String(approvedApplication.id).padStart(4, "0")}`,
            branch: "",
            phoneNumber: approvedApplication.phone || "",
          });
        } else {
          existingUser.role = "college";
          existingUser.status = "active";
          existingUser.name = approvedApplication.collegeName || existingUser.name;
          existingUser.regId = existingUser.regId || `CLG-${String(approvedApplication.id).padStart(4, "0")}`;
          existingUser.phoneNumber = approvedApplication.phone || existingUser.phoneNumber || "";
          if (!String(existingUser.avatar || "").trim()) {
            existingUser.avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(approvedApplication.collegeName)}`;
          }
          await existingUser.save();
        }

        collegeOwner = existingUser;
      }
    }

    if (collegeOwner) {
      return res.json({
        success: true,
        authorized: true,
        user: {
          id: String(collegeOwner._id),
          memberId: collegeOwner.id,
          email: collegeOwner.email,
          name: collegeOwner.name,
          role: "college",
          regId: collegeOwner.regId || "",
          avatar: payload.picture || collegeOwner.avatar || "",
          phone: collegeOwner.phoneNumber || "",
          branch: "",
          course: "",
          year: "",
        },
        token: googleToken,
      });
    }

    // Search for the user in CollegeMember (students/teachers)
    const collegeMember = await CollegeMember.findOne({ email, status: "active" });

    if (!collegeMember) {
      return res.status(401).json({
        message: "Email not registered in college panel. Only registered students and teachers can access.",
        authorized: false,
      });
    }

    const role = collegeMember.role === "teacher" ? "teacher" : "student";

    res.json({
      success: true,
      authorized: true,
      user: {
        id: collegeMember._id,
        memberId: collegeMember.id,
        email: collegeMember.email,
        name: collegeMember.name,
        role,
        regId: collegeMember.regId,
        avatar: payload.picture || "",
        phone: collegeMember.phone,
        branch: collegeMember.branch,
        course: collegeMember.course,
        year: collegeMember.year,
        collegeEmail: collegeMember.collegeEmail,
      },
      token: googleToken,
    });
  } catch (error) {
    console.error("Auth error:", error);
    const statusCode = error?.message?.toLowerCase?.().includes("token") ? 401 : 500;
    res.status(statusCode).json({
      message: statusCode === 401 ? "Invalid or expired Google token" : "Authentication failed",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Simple endpoint to check if email exists in college panel
 * Body: { email: string }
 */
router.post("/verify-email", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const collegeMember = await CollegeMember.findOne({
      email: email.toLowerCase(),
    });

    if (!collegeMember) {
      return res.json({
        exists: false,
        message: "Email not registered",
      });
    }

    res.json({
      exists: true,
      role: collegeMember.role === "teacher" ? "teacher" : "student",
      name: collegeMember.name,
    });
  } catch (error) {
    res.status(500).json({
      message: "Verification failed",
      error: error.message,
    });
  }
});

/**
 * POST /api/auth/college-owner-access
 * Check whether an email is approved for college admin access
 * Body: { email: string }
 */
router.post("/college-owner-access", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required", allowed: false });
    }

    const collegeUser = await User.findOne({ email, role: "college", status: "active" }).select(
      "_id id name email regId avatar phoneNumber"
    );

    if (collegeUser) {
      return res.json({
        allowed: true,
        user: {
          id: String(collegeUser._id),
          memberId: collegeUser.id,
          email: collegeUser.email,
          name: collegeUser.name,
          role: "college",
          regId: collegeUser.regId || "",
          avatar: collegeUser.avatar || "",
          phone: collegeUser.phoneNumber || "",
          branch: "",
          course: "",
          year: "",
        },
      });
    }

    const approvedApplication = await CollegeApplication.findOne({ ownerEmail: email, status: "approved" })
      .sort({ reviewedAt: -1, id: -1 })
      .select("id collegeName ownerEmail phone");

    if (!approvedApplication) {
      return res.json({ allowed: false });
    }

    res.json({
      allowed: true,
      user: {
        id: "",
        memberId: null,
        email,
        name: approvedApplication.collegeName,
        role: "college",
        regId: `CLG-${String(approvedApplication.id).padStart(4, "0")}`,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(approvedApplication.collegeName)}`,
        phone: approvedApplication.phone || "",
        branch: "",
        course: "",
        year: "",
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify college owner access", allowed: false });
  }
});

export default router;
