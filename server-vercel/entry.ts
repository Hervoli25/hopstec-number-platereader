import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "http";
import "dotenv/config";

// Create Express app for Vercel serverless
const app = express();
const httpServer = createServer(app);

// Middleware
app.use(
  express.json({
    verify: (req: any, _res: any, buf: any) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Initialize routes (called once per cold start)
let initialized = false;
let initPromise: Promise<void> | null = null;

async function initialize() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log("Initializing Vercel serverless function...");
    await registerRoutes(httpServer, app);

    // Error handler - must be added AFTER routes
    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Internal Server Error:", err);

      if (res.headersSent) {
        return next(err);
      }
      return res.status(status).json({ message });
    });

    initialized = true;
    console.log("Vercel serverless function initialized");
  })();

  return initPromise;
}

// Vercel serverless handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure routes are initialized
  await initialize();

  // Let Express handle the request
  return new Promise<void>((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
