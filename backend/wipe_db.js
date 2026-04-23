import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectToDatabase } from "./src/config/db.js";

dotenv.config({ override: true });

async function wipe() {
  try {
    await connectToDatabase();
    console.log("Connected to MongoDB for wiping...");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      const name = collection.name;
      console.log(`Dropping collection: ${name}`);
      await db.collection(name).drop().catch(err => {
        // Handle cases where collection might have been deleted between list and drop
        console.warn(`Could not drop ${name}:`, err.message);
      });
    }

    console.log("✅ All collections dropped successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Wipe failed:", err);
    process.exit(1);
  }
}

wipe();
