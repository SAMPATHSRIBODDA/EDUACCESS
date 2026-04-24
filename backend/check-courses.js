import mongoose from "mongoose";
import dotenv from "dotenv";
import { Course } from "./src/models/Course.js";

dotenv.config();

const checkCourses = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eduaccess");
    const courses = await Course.find();
    console.log("Course Title | CreatedBy | CollegeEmail");
    console.log("-----------------------------------------");
    courses.forEach(c => {
      console.log(`${c.title} | ${c.createdBy} | ${c.collegeEmail}`);
    });
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkCourses();
