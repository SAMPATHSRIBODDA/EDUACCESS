import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from one level up (backend folder)
dotenv.config({ path: path.join(__dirname, "../../.env"), override: true });

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eduaccess";

async function cleanDatabase() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(mongoUri);
    console.log(`Connected to: ${mongoose.connection.name}`);

    const collections = await mongoose.connection.db.collections();

    for (let collection of collections) {
      console.log(`Dropping collection: ${collection.collectionName}`);
      await collection.drop();
    }

    console.log("Database cleaned successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error cleaning database:", error);
    process.exit(1);
  }
}

cleanDatabase();
