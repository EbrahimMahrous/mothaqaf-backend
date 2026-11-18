const Settings = require("../models/Settings");
const cloudinary = require("../config/cloudinary");

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { social, whatsapp, contactEmail } = req.body;
    const settings = await Settings.getSettings();

    if (social) {
      settings.social = { ...settings.social.toObject?.(), ...social };
    }
    if (whatsapp !== undefined) settings.whatsapp = whatsapp;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;

    await settings.save();
    res.json({ success: true, message: "تم تحديث الإعدادات", data: settings });
  } catch (err) {
    next(err);
  }
};

exports.updateLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "لازم ترفع لوجو" });
    }
    const settings = await Settings.getSettings();
    if (settings.logo?.publicId) {
      await cloudinary.uploader.destroy(settings.logo.publicId);
    }
    settings.logo = { url: req.file.path, publicId: req.file.filename };
    await settings.save();
    res.json({ success: true, message: "تم تحديث اللوجو", data: settings });
  } catch (err) {
    next(err);
  }
};
