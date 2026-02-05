import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

// Use /tmp on Vercel (serverless), otherwise use local uploads directory
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
  // Continue anyway - uploads might fail but app should still work
}

export interface PhotoSaveResult {
  url: string;
  filename: string;
}

export async function savePhoto(base64Data: string): Promise<PhotoSaveResult> {
  // Ensure directory exists before saving
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn("Could not create uploads directory:", error);
  }

  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Image, "base64");

  const filename = `${randomUUID()}.jpg`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await fs.promises.writeFile(filepath, buffer);

  // On Vercel, photos in /tmp are ephemeral and won't be accessible via URL
  // For production, consider using Vercel Blob or another cloud storage
  return {
    url: `/uploads/${filename}`,
    filename
  };
}

export function getPhotoPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}
