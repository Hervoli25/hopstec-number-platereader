import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production (bundled), __dirname points to dist/
  // In development, __dirname points to server/
  const distPath = process.env.NODE_ENV === "production"
    ? path.resolve(process.cwd(), "dist", "public")
    : path.resolve(__dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // IMPORTANT: Set Content-Type header to prevent browser from downloading the file
  app.use("*", (req, res) => {
    // Don't serve HTML for API routes - they should have been handled already
    if (req.originalUrl.startsWith("/api/")) {
      return res.status(404).json({ message: "API route not found", path: req.originalUrl });
    }
    res.setHeader("Content-Type", "text/html");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
