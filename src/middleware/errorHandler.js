const errorHandler = (err, req, res, next) => {
  console.error("🔥 Error:", err.message);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ success: false, message: "حجم الملف كبير جدًا" });
  }
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "توكن غير صالح" });
  }
  if (err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json({ success: false, message: "انتهت صلاحية التوكن" });
  }
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res
      .status(400)
      .json({ success: false, message: messages.join(", ") });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res
      .status(400)
      .json({ success: false, message: `القيمة مكررة في الحقل: ${field}` });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "خطأ في السيرفر",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

const notFound = (req, res) => {
  res
    .status(404)
    .json({ success: false, message: `المسار غير موجود: ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
