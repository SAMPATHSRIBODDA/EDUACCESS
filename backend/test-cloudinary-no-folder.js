import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({ path: './.env' });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
});

async function testUpload() {
    try {
        console.log("Attempting test upload (NO FOLDER)...");
        const result = await cloudinary.uploader.upload("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", {
            resource_type: "auto"
        });
        console.log("Upload Success!");
        console.log("URL:", result.secure_url);
    } catch (error) {
        console.error("Upload Failed!");
        console.error(error);
    }
}

testUpload();
