import mongoose from "mongoose";
import dotenv from "dotenv";
import { Course } from "./src/models/Course.js";

dotenv.config();

const manualFix = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eduaccess");
    const result = await Course.updateMany(
      { createdBy: "teacher@edu.com" },
      { $set: { createdBy: "sampathsribodda123@gmail.com" } }
    );
    console.log(`Updated ${result.modifiedCount} courses.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

manualFix();
