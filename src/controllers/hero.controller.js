const mongoose = require("mongoose");
const HeroImage = require("../models/HeroImage");
const cloudinary = require("../config/cloudinary");

// GET /api/hero — public
exports.getAll = async (req, res, next) => {
  try {
    const images = await HeroImage.find()
      .sort({ order: 1, createdAt: -1 })
      .populate("fileId", "title format size downloads views videoUrl");
    res.json({ success: true, count: images.length, data: images });
  } catch (err) {
    next(err);
  }
};

// POST /api/hero — admin
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "لازم ترفع صورة" });
    }
    const count = await HeroImage.countDocuments();
    const {
      title,
      description,
      alt,
      badge,
      fileId,
      videoUrl,
      ctaLabel,
      ctaHref,
    } = req.body;

    let fileRef = null;
    if (fileId) {
      if (!mongoose.Types.ObjectId.isValid(fileId)) {
        return res
          .status(400)
          .json({ success: false, message: "fileId غير صالح" });
      }
      fileRef = fileId;
    }

    const image = await HeroImage.create({
      url: req.file.path,
      publicId: req.file.filename,
      alt: alt || "",
      title: title || "",
      description: description || "",
      badge: badge || "",
      order: count,
      fileId: fileRef,
      videoUrl: videoUrl || "",
      ctaLabel: ctaLabel || "",
      ctaHref: ctaHref || "",
    });

    await image.populate("fileId", "title format size videoUrl");

    res
      .status(201)
      .json({ success: true, message: "تم رفع الصورة", data: image });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/hero/:id — admin
exports.update = async (req, res, next) => {
  try {
    const image = await HeroImage.findById(req.params.id);
    if (!image) {
      return res
        .status(404)
        .json({ success: false, message: "الصورة غير موجودة" });
    }

    const {
      title,
      description,
      alt,
      badge,
      fileId,
      videoUrl,
      ctaLabel,
      ctaHref,
      order,
    } = req.body;

    if (title !== undefined) image.title = title;
    if (description !== undefined) image.description = description;
    if (alt !== undefined) image.alt = alt;
    if (badge !== undefined) image.badge = badge;
    if (videoUrl !== undefined) image.videoUrl = videoUrl;
    if (ctaLabel !== undefined) image.ctaLabel = ctaLabel;
    if (ctaHref !== undefined) image.ctaHref = ctaHref;
    if (order !== undefined) image.order = Number(order);

    if (fileId !== undefined) {
      if (fileId === null || fileId === "") {
        image.fileId = null;
      } else if (mongoose.Types.ObjectId.isValid(fileId)) {
        image.fileId = fileId;
      } else {
        return res
          .status(400)
          .json({ success: false, message: "fileId غير صالح" });
      }
    }

    await image.save();
    await image.populate("fileId", "title format size videoUrl");

    res.json({ success: true, message: "تم التحديث", data: image });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/hero/:id/replace — admin
exports.replace = async (req, res, next) => {
  try {
    const image = await HeroImage.findById(req.params.id);
    if (!image) {
      return res
        .status(404)
        .json({ success: false, message: "الصورة غير موجودة" });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "لازم ترفع صورة جديدة" });
    }
    await cloudinary.uploader.destroy(image.publicId);
    image.url = req.file.path;
    image.publicId = req.file.filename;
    await image.save();
    res.json({ success: true, message: "تم استبدال الصورة", data: image });
  } catch (err) {
    next(err);
  }
};

// POST /api/hero/:id/view — public
exports.incrementView = async (req, res, next) => {
  try {
    await HeroImage.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { returnDocument: "after" },
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/hero/:id/click — public
exports.incrementClick = async (req, res, next) => {
  try {
    await HeroImage.findByIdAndUpdate(
      req.params.id,
      { $inc: { clicks: 1 } },
      { returnDocument: "after" },
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/hero/:id — admin
exports.remove = async (req, res, next) => {
  try {
    const image = await HeroImage.findById(req.params.id);
    if (!image) {
      return res
        .status(404)
        .json({ success: false, message: "الصورة غير موجودة" });
    }
    await cloudinary.uploader.destroy(image.publicId);
    await image.deleteOne();
    res.json({ success: true, message: "تم حذف الصورة" });
  } catch (err) {
    next(err);
  }
};
