// Simple Vercel serverless wrapper - NO bundling needed
// Vercel will compile this and install dependencies automatically

import express from 'express';
import { registerRoutes } from '../server/routes.js';
import { createServer } from 'http';
import 'dotenv/config';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize routes once
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

// Vercel handler
export default async function handler(req, res) {
  await initialize();
  return app(req, res);
}
