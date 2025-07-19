// app/lib/minio-storage.js
import { Client } from "minio";

// MinIO client configuration
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost", // or your Pi's IP: '192.168.2.100'
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === "true" || false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "resumes";

// Ensure bucket exists
async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME);
      console.log(`✅ Created bucket: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error("❌ Error ensuring bucket exists:", error);
    throw error;
  }
}

export async function uploadToMinio(file, filePath) {
  try {
    console.log("📤 Uploading to MinIO:", filePath);

    await ensureBucketExists();

    // Convert file to buffer if it's a File object
    let fileBuffer;
    if (file instanceof File || file.stream) {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      fileBuffer = file;
    }

    // Upload to MinIO
    const result = await minioClient.putObject(
      BUCKET_NAME,
      filePath,
      fileBuffer,
      fileBuffer.length,
      {
        "Content-Type": file.type || "application/octet-stream",
      }
    );

    console.log("✅ MinIO upload success:", result);

    return {
      data: {
        path: filePath,
        etag: result.etag,
      },
      error: null,
    };
  } catch (error) {
    console.error("❌ MinIO upload error:", error);
    return { data: null, error };
  }
}

export async function deleteFromMinio(filePath) {
  try {
    console.log("🗑️ Deleting from MinIO:", filePath);

    await minioClient.removeObject(BUCKET_NAME, filePath);

    console.log("✅ MinIO delete success:", filePath);
    return { data: { path: filePath }, error: null };
  } catch (error) {
    console.error("❌ MinIO delete error:", error);
    return { data: null, error };
  }
}

export async function getMinioDownloadUrl(filePath, expiryInSeconds = 3600) {
  try {
    console.log("🔗 Generating MinIO download URL:", filePath);

    // Generate presigned URL (valid for 1 hour by default)
    const url = await minioClient.presignedGetObject(
      BUCKET_NAME,
      filePath,
      expiryInSeconds
    );

    console.log("✅ MinIO download URL generated");
    return {
      data: { signedUrl: url },
      error: null,
    };
  } catch (error) {
    console.error("❌ MinIO download URL error:", error);
    return { data: null, error };
  }
}

// Helper function to list files (useful for debugging)
export async function listMinioFiles(prefix = "") {
  try {
    const objectsStream = minioClient.listObjects(BUCKET_NAME, prefix, true);
    const objects = [];

    return new Promise((resolve, reject) => {
      objectsStream.on("data", (obj) => objects.push(obj));
      objectsStream.on("end", () => resolve({ data: objects, error: null }));
      objectsStream.on("error", (err) => reject({ data: null, error: err }));
    });
  } catch (error) {
    console.error("❌ MinIO list error:", error);
    return { data: null, error };
  }
}

// Check if MinIO is accessible
export async function testMinioConnection() {
  try {
    await ensureBucketExists();
    console.log("✅ MinIO connection successful");
    return { success: true };
  } catch (error) {
    console.error("❌ MinIO connection failed:", error);
    return { success: false, error: error.message };
  }
}
