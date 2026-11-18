const DownloadFile = require("../models/DownloadFile");
const cloudinary = require("../config/cloudinary");

exports.getAll = async (req, res, next) => {
  try {
    const files = await DownloadFile.find().sort({ createdAt: -1 });
    res.json({ success: true, count: files.length, data: files });
  } catch (err) {
    next(err);
  }
};

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "لازم ترفع ملف" });
    }
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: "العنوان مطلوب" });
    }
    const fileDoc = await DownloadFile.create({
      title,
      description: description || "",
      url: req.file.path,
      publicId: req.file.filename,
      size: req.file.size || 0,
      format: req.file.format || "",
    });
    res
      .status(201)
      .json({ success: true, message: "تم رفع الملف", data: fileDoc });
  } catch (err) {
    next(err);
  }
};

exports.download = async (req, res, next) => {
  try {
    const fileDoc = await DownloadFile.findById(req.params.id);
    if (!fileDoc) {
      return res
        .status(404)
        .json({ success: false, message: "الملف غير موجود" });
    }
    fileDoc.downloads += 1;
    await fileDoc.save();
    res.redirect(fileDoc.url);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const fileDoc = await DownloadFile.findById(req.params.id);
    if (!fileDoc) {
      return res
        .status(404)
        .json({ success: false, message: "الملف غير موجود" });
    }
    await cloudinary.uploader.destroy(fileDoc.publicId, {
      resource_type: "raw",
    });
    await fileDoc.deleteOne();
    res.json({ success: true, message: "تم حذف الملف" });
  } catch (err) {
    next(err);
  }
};
