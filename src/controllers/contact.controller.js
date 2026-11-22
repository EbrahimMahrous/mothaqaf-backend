const mongoose = require("mongoose");
const ContactMessage = require("../models/ContactMessage");

// POST /api/contact — public
exports.submit = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "كل الحقول مطلوبة" });
    }

    const doc = await ContactMessage.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim(),
      ipAddress:
        (req.headers["x-forwarded-for"] || "")
          .toString()
          .split(",")[0]
          .trim() ||
        req.ip ||
        "",
      userAgent: req.headers["user-agent"] || "",
    });

    res.status(201).json({
      success: true,
      message: "تم إرسال رسالتك، هرد عليك قريبًا",
      data: { id: doc._id },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/contact — admin (list)
exports.getAll = async (req, res, next) => {
  try {
    const { status, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ContactMessage.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: items.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: items,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/contact/:id — admin (update status)
exports.updateStatus = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID غير صالح" });
    }

    const { status } = req.body;
    if (!["new", "read", "replied", "archived"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Status غير صالح" });
    }

    const doc = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: "after" },
    );
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "الرسالة غير موجودة" });
    }

    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/contact/:id — admin (hard delete)
exports.remove = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "ID غير صالح" });
    }

    const doc = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: "الرسالة غير موجودة" });
    }

    res.json({ success: true, message: "تم الحذف", data: { id: doc._id } });
  } catch (err) {
    next(err);
  }
};
