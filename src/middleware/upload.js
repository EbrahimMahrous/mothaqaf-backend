const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Images (Hero, Logo)
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mosaqaf/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg"],
    transformation: [{ width: 1920, crop: "limit", quality: "auto" }],
  },
});

// Files for download (PDF, ZIP, DOCX, etc.)
const fileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mosaqaf/files",
    resource_type: "raw",
    allowed_formats: ["pdf", "doc", "docx", "zip", "rar", "txt", "xlsx"],
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

module.exports = { uploadImage, uploadFile };
