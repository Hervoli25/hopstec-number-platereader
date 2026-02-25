import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// ──── Storage mode ────
// Set STORAGE_MODE=s3 to use S3/R2, otherwise defaults to local filesystem
const STORAGE_MODE = (process.env.STORAGE_MODE || "local") as "local" | "s3";

// ──── Local filesystem config ────
const isVercel = process.env.VERCEL === "1";
const UPLOAD_DIR = isVercel
  ? "/tmp/uploads"
  : path.join(process.cwd(), "uploads");

// Ensure upload directory exists (wrapped in try-catch for serverless)
try {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
} catch (error) {
  console.warn("Could not create uploads directory:", error);
}

// ──── S3 / R2 config ────
// Required env vars when STORAGE_MODE=s3:
//   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
// Optional: S3_ENDPOINT (for R2, MinIO, etc.), S3_PUBLIC_URL (custom CDN domain)
let s3Client: S3Client | null = null;
const S3_BUCKET = process.env.S3_BUCKET || "";
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL || ""; // e.g. https://cdn.example.com

function getS3Client(): S3Client {
  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT;
    s3Client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: !!endpoint, // needed for R2/MinIO
    });
  }
  return s3Client;
}

export interface PhotoSaveResult {
  url: string;
  filename: string;
}

// ──── Local save ────
async function savePhotoLocal(buffer: Buffer, filename: string): Promise<PhotoSaveResult> {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn("Could not create uploads directory:", error);
  }

  const filepath = path.join(UPLOAD_DIR, filename);
  await fs.promises.writeFile(filepath, buffer);

  return {
    url: `/uploads/${filename}`,
    filename,
  };
}

// ──── S3 save ────
async function savePhotoS3(buffer: Buffer, filename: string): Promise<PhotoSaveResult> {
  const key = `photos/${filename}`;
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  // Build public URL
  const url = S3_PUBLIC_URL
    ? `${S3_PUBLIC_URL}/${key}`
    : `https://${S3_BUCKET}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;

  return { url, filename };
}

// ──── Public API (unchanged signature) ────
export async function savePhoto(base64Data: string): Promise<PhotoSaveResult> {
  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Image, "base64");
  const filename = `${randomUUID()}.jpg`;

  if (STORAGE_MODE === "s3") {
    return savePhotoS3(buffer, filename);
  }
  return savePhotoLocal(buffer, filename);
}

export function getPhotoPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}

/** Get the current storage mode for diagnostics */
export function getStorageMode(): string {
  return STORAGE_MODE;
}
