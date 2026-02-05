// Vercel serverless function entry point
// This gets bundled to api/index.js by the build script

import express from 'express';
import { registerRoutes } from './server/routes.js';
import { createServer } from 'http';
import 'dotenv/config';

const app = express();
const httpServer = createServer(app);

// Body parsing middleware - MUST be before routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

let initialized = false;
let initPromise = null;

async function initialize() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('Initializing Vercel serverless function...');
    await registerRoutes(httpServer, app);
    initialized = true;
    console.log('Initialization complete');
  })();

  return initPromise;
}

// Vercel serverless handler
export default async function handler(req, res) {
  try {
    await initialize();

    // Use Express to handle the request with proper Promise wrapping
    return new Promise((resolve) => {
      // Store original end function
      const originalEnd = res.end.bind(res);

      // Override end to resolve the promise
      res.end = function(...args) {
        originalEnd(...args);
        resolve();
      };

      // Let Express handle the request
      app(req, res);
    });
  } catch (error) {
    console.error('Handler error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Server initialization failed', error: error.message });
    }
  }
}
