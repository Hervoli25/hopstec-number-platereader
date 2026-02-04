// Vercel serverless function entry point
// This file exports the Express app as a serverless function

// Set environment variable for Vercel
process.env.VERCEL = '1';
process.env.NODE_ENV = 'production';

// Lazy initialization to ensure app is ready before handling requests
let appInstance = null;
let initPromise = null;

async function getApp() {
  if (appInstance) {
    return appInstance;
  }

  if (!initPromise) {
    initPromise = (async () => {
      // Import the built server
      const serverModule = require('../dist/index.cjs');

      // Get the default export (the Express app)
      appInstance = serverModule.default || serverModule;

      // Give it a moment to finish any async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      return appInstance;
    })();
  }

  return initPromise;
}

// Export a handler that ensures initialization before processing requests
module.exports = async (req, res) => {
  const app = await getApp();
  return app(req, res);
};

