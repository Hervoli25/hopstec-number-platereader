// Vercel serverless function entry point
// This file exports the Express app as a serverless function

// Set environment variable for Vercel
process.env.VERCEL = '1';

// Import the built server
const serverModule = require('../dist/index.cjs');

// Get the default export (the Express app)
const app = serverModule.default || serverModule;

// Export the handler for Vercel
module.exports = app;

