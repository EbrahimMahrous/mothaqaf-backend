const HeroImage = require("../models/HeroImage");
const cloudinary = require("../config/cloudinary");

exports.getAll = async (req, res, next) => {
  try {
    const images = await HeroImage.find().sort({ order: 1, createdAt: -1 });
    res.json({ success: true, count: images.length, data: images });
  } catch (err) {
    next(err);
  }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "لازم ترفع صورة" });
    }
    const count = await HeroImage.countDocuments();
    const image = await HeroImage.create({
      url: req.file.path,
      publicId: req.file.filename,
      alt: req.body.alt || "",
      order: count,
    });
    res
      .status(201)
      .json({ success: true, message: "تم رفع الصورة", data: image });
  } catch (err) {
    next(err);
  }
};

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
