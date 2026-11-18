const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL?.split(",") || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

app.get("/", (req, res) => {
  res.json({ success: true, message: "Mosaqaf API شغال ✅", version: "1.0.0" });
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/hero", require("./routes/hero.routes"));
app.use("/api/files", require("./routes/files.routes"));
app.use("/api/newsletter", require("./routes/newsletter.routes"));
app.use("/api/settings", require("./routes/settings.routes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
