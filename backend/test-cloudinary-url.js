import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({ path: './.env' });

// Cloudinary automatically picks up CLOUDINARY_URL from process.env if available
// but we'll be explicit to be safe.

console.log("Testing with CLOUDINARY_URL...");
if (!process.env.CLOUDINARY_URL) {
    console.error("CLOUDINARY_URL not found in .env");
    process.exit(1);
}

async function testUpload() {
    try {
        console.log("Attempting test upload (AUTO)...");
        const result = await cloudinary.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", {
            folder: "test-folder"
        });
        console.log("Upload Success!");
        console.log("URL:", result.secure_url);
    } catch (error) {
        console.error("Upload Failed!");
        console.error(error);
    }
}

testUpload();
