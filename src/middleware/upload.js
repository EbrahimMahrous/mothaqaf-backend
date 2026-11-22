const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "mosaqaf/images",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "svg"],
    transformation: [{ width: 1920, crop: "limit", quality: "auto" }],
  },
});

// Store PDFs as Cloudinary "image" so they can be served inline (view).
// Other document types remain "raw" (download-only).
const fileStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      /\.pdf$/i.test(file.originalname || "");

    return {
      folder: "mosaqaf/files",
      resource_type: isPdf ? "image" : "raw",
      format: isPdf ? "pdf" : undefined,
      allowed_formats: ["pdf", "doc", "docx", "zip", "rar", "txt", "xlsx"],
      public_id: `${Date.now()}-${(file.originalname || "file")
        .replace(/\.[^/.]+$/, "")
        .replace(/[^\w-]/g, "_")
        .slice(0, 60)}`,
    };
  },
});

const attachmentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype?.startsWith("image/");
    return {
      folder: "mosaqaf/campaign-attachments",
      resource_type: isImage ? "image" : "raw",
      allowed_formats: [
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
        "pdf",
        "doc",
        "docx",
        "zip",
        "rar",
        "txt",
        "xlsx",
      ],
    };
  },
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});
const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});
const uploadAttachment = multer({
  storage: attachmentStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

module.exports = { uploadImage, uploadFile, uploadAttachment };
