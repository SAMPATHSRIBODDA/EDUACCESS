import mongoose from "mongoose";
import dotenv from "dotenv";
import { Course } from "./src/models/Course.js";
import { CollegeMember } from "./src/models/CollegeMember.js";

dotenv.config();

const fixOwnership = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eduaccess");
    console.log("Connected to MongoDB");

    // Find all courses with the placeholder createdBy
    const courses = await Course.find({ createdBy: "teacher@edu.com" });
    console.log(`Found ${courses.length} courses with placeholder owner.`);

    for (const course of courses) {
      if (course.collegeEmail) {
        // Try to find the first teacher in that college to assign as owner
        const teacher = await CollegeMember.findOne({ 
          collegeEmail: course.collegeEmail, 
          role: "teacher" 
        });

        if (teacher) {
          console.log(`Assigning course "${course.title}" to teacher: ${teacher.email}`);
          course.createdBy = teacher.email;
          await course.save();
        } else {
          console.log(`No teacher found for college: ${course.collegeEmail} (Course: ${course.title})`);
        }
      }
    }

    console.log("Fix completed.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

fixOwnership();
