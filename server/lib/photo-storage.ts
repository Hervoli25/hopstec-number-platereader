import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface PhotoSaveResult {
  url: string;
  filename: string;
}

export async function savePhoto(base64Data: string): Promise<PhotoSaveResult> {
  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Image, "base64");
  
  const filename = `${randomUUID()}.jpg`;
  const filepath = path.join(UPLOAD_DIR, filename);
  
  await fs.promises.writeFile(filepath, buffer);
  
  return {
    url: `/uploads/${filename}`,
    filename
  };
}

export function getPhotoPath(filename: string): string {
  return path.join(UPLOAD_DIR, filename);
}
