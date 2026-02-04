// Vercel serverless function entry point
// This file exports the Express app as a serverless function

// Import the built server
const serverModule = require('../dist/index.cjs');

// Get the default export (the Express app)
const app = serverModule.default || serverModule;

// Export for Vercel
module.exports = app;

