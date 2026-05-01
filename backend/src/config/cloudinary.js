import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function configureCloudinary() {
  if (isConfigured) {
    return true;
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  isConfigured = true;
  return true;
}

function ensureCloudinaryConfigured() {
  if (!configureCloudinary()) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }
}

export function parseDataUriMime(dataUri) {
  const raw = String(dataUri || "");
  const match = raw.match(/^data:([^;]+);base64,/i);
  return match ? String(match[1]).toLowerCase() : "";
}

export async function uploadDataUriToCloudinary({ dataUri, folder = "eduaccess", fileName = "asset", resourceType = "auto" }) {
  ensureCloudinaryConfigured();

  try {
    const response = await cloudinary.uploader.upload(String(dataUri), {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      filename_override: String(fileName || "asset"),
    });

    return response;
  } catch (error) {
    const err = error;
    console.error("[Cloudinary Error Detail]:", {
      message: err.message,
      http_code: err.http_code,
      name: err.name
    });

    if (err && err.http_code === 403) {
      throw new Error("Cloudinary Forbidden (403): Check if your account is over the limit, email is verified, or credentials are active.");
    }
    throw error;
  }
}

export async function uploadBufferToCloudinary({ buffer, folder = "eduaccess", fileName = "asset", resourceType = "auto" }) {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        filename_override: String(fileName || "asset"),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}
