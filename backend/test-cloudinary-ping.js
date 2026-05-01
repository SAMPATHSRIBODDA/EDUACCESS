import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config({ path: './.env' });

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

async function testPing() {
    try {
        console.log("Pinging Cloudinary API...");
        const result = await cloudinary.api.ping();
        console.log("Ping Success!");
        console.log(result);
    } catch (error) {
        console.error("Ping Failed!");
        console.error(error);
    }
}

testPing();
