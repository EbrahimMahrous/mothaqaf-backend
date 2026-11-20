require("dotenv").config({ path: ".env.local" });
require("dotenv").config(); // fallback to .env

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === "1";

// ─────────────────────────────────────────────────────────────
// Local development: start server + listen on port
// ─────────────────────────────────────────────────────────────

if (!isVercel) {
  const start = async () => {
    try {
      await connectDB();
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      });
    } catch (err) {
      console.error("❌ Failed to start server:", err.message);
      process.exit(1);
    }
  };

  start();
}

// ─────────────────────────────────────────────────────────────
// Vercel: export the app, no listen
// Connection is handled per-request by middleware
// ─────────────────────────────────────────────────────────────

module.exports = app;
