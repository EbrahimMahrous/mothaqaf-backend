const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

// ─────────────────────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // API, not HTML — CSP not needed
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow Cloudinary images
  }),
);

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.FRONTEND_URL ||
  "http://localhost:3001,http://localhost:3002,http://localhost:3000"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

console.log("🔐 CORS allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (allowedOrigins.includes("*")) return callback(null, true);

      console.warn(`❌ CORS blocked: ${origin}`);
      return callback(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Handle preflight
app.options("*", cors());

// ─────────────────────────────────────────────────────────────
// Body parsers
// ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// Rate limiting
// ─────────────────────────────────────────────────────────────
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "طلبات كتير، جرب تاني بعد شوية" },
  }),
);

// ─────────────────────────────────────────────────────────────
// DB connection middleware (Vercel-friendly)
// Ensures MongoDB is connected before any route runs.
// On local, this is a no-op after the first request (cached).
// ─────────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB middleware error:", err.message);
    res.status(503).json({
      success: false,
      message: "قاعدة البيانات مش متاحة حاليًا، جرب تاني",
    });
  }
});

// ─────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Mosaqaf API شغال ✅",
    version: "1.0.0",
    env: process.env.VERCEL ? "vercel" : "local",
  });
});

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/hero", require("./routes/hero.routes"));
app.use("/api/files", require("./routes/files.routes"));
app.use("/api/newsletter", require("./routes/newsletter.routes"));
app.use("/api/settings", require("./routes/settings.routes"));

// ─────────────────────────────────────────────────────────────
// 404 + Error handlers
// ─────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
