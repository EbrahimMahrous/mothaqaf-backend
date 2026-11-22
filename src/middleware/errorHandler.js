// ─────────────────────────────────────────────────────────────
// Central error handler
// ─────────────────────────────────────────────────────────────

exports.notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `المسار غير موجود: ${req.originalUrl}`,
  });
};

exports.errorHandler = (err, req, res, next) => {
  // Log full error server-side
  console.error("🔥 Error:", err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // Mongoose: invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "ID غير صالح",
    });
  }

  // Mongoose: schema validation
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", ") || "بيانات غير صالحة",
    });
  }

  // Mongoose: duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `القيمة موجودة بالفعل: ${field}`,
    });
  }

  // CORS
  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({
      success: false,
      message: "الطلب غير مسموح من هذا المصدر",
    });
  }

  // Fallback
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || "حصل خطأ في السيرفر، جرب تاني",
  });
};
