// Vercel serverless function entry point
// This gets bundled to api/server.cjs by the build script

import express from 'express';
import { registerRoutes } from '../server/routes.js';
import { createServer } from 'http';
import 'dotenv/config';

const app = express();
const httpServer = createServer(app);

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

export default async function handler(req, res) {
  await initialize();
  return app(req, res);
}
