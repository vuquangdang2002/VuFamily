// Express app is the only serverless function we need!
// This bypasses the Vercel 12 functions hobby limit.
const app = require('../server/index');

module.exports = app;
