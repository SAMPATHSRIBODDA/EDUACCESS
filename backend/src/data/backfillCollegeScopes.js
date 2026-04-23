import { CollegeApplication } from "../models/CollegeApplication.js";
import { CollegeMember } from "../models/CollegeMember.js";
import { Course } from "../models/Course.js";
import { Event } from "../models/Event.js";
import { Announcement } from "../models/Announcement.js";
import { CollegeActivity } from "../models/CollegeActivity.js";
import { User } from "../models/User.js";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hasCollegeEmail(value) {
  return Boolean(normalizeEmail(value));
}

function pickCollegeEmail(collegeEmails, index) {
  if (!Array.isArray(collegeEmails) || collegeEmails.length === 0) {
    return "";
  }

  return collegeEmails[index % collegeEmails.length];
}

async function resolveCollegeEmails() {
  const [collegeUsers, approvedApplications] = await Promise.all([
    User.find({ role: "college", status: "active" }).sort({ id: 1 }).select("email"),
    CollegeApplication.find({ status: "approved" }).sort({ reviewedAt: -1, id: 1 }).select("ownerEmail"),
  ]);

  const emails = [];
  collegeUsers.forEach((user) => {
    const email = normalizeEmail(user.email);
    if (email && !emails.includes(email)) {
      emails.push(email);
    }
  });

  approvedApplications.forEach((application) => {
    const email = normalizeEmail(application.ownerEmail);
    if (email && !emails.includes(email)) {
      emails.push(email);
    }
  });

  return emails;
}

async function backfillCollectionEmails(Model, query, mapRecordToUpdate) {
  const records = await Model.find(query).sort({ id: 1 }).select("_id id collegeEmail panel status role");
  if (!records.length) {
    return 0;
  }

  const collegeEmails = await resolveCollegeEmails();
  if (!collegeEmails.length) {
    return 0;
  }

  let updatedCount = 0;
  const operations = [];

  records.forEach((record, index) => {
    if (hasCollegeEmail(record.collegeEmail)) {
      return;
    }

    const collegeEmail = pickCollegeEmail(collegeEmails, updatedCount);
    if (!collegeEmail) {
      return;
    }

    updatedCount += 1;
    operations.push({
      updateOne: {
        filter: { _id: record._id },
        update: { $set: mapRecordToUpdate(record, collegeEmail) },
      },
    });
  });

  if (operations.length > 0) {
    await Model.bulkWrite(operations, { ordered: false });
  }

  return operations.length;
}

export async function backfillCollegeScopes() {
  const collegeEmails = await resolveCollegeEmails();
  if (collegeEmails.length === 0) {
    return {
      collegeEmails: [],
      updated: {},
    };
  }

  const updated = {};
  const missingCollegeEmailFilter = {
    $or: [{ collegeEmail: { $exists: false } }, { collegeEmail: null }, { collegeEmail: "" }],
  };

  updated.collegeMembers = await backfillCollectionEmails(
    CollegeMember,
    missingCollegeEmailFilter,
    (_record, collegeEmail) => ({ collegeEmail })
  );

  updated.courses = await backfillCollectionEmails(
    Course,
    missingCollegeEmailFilter,
    (_record, collegeEmail) => ({ collegeEmail })
  );

  updated.events = await backfillCollectionEmails(
    Event,
    { panel: "college", ...missingCollegeEmailFilter },
    (_record, collegeEmail) => ({ collegeEmail })
  );

  updated.announcements = await backfillCollectionEmails(
    Announcement,
    { panel: "college", ...missingCollegeEmailFilter },
    (_record, collegeEmail) => ({ collegeEmail })
  );

  updated.activities = await backfillCollectionEmails(
    CollegeActivity,
    missingCollegeEmailFilter,
    (_record, collegeEmail) => ({ collegeEmail })
  );

  return {
    collegeEmails,
    updated,
  };
}
