const mongoose = require("mongoose");

const downloadFileSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "العنوان مطلوب"], trim: true },
    description: { type: String, default: "" },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    size: { type: Number, default: 0 },
    format: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    downloads: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    category: {
      type: String,
      enum: ["management", "career", "business", "decision", "other"],
      default: "other",
    },
    tags: [{ type: String, trim: true }],
    coverImage: { type: String, default: "" },
    videoUrl: { type: String, default: "" }, // ← ✅ الحقل الناقص
    isNew: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  },
);

downloadFileSchema.index({ createdAt: -1 });
downloadFileSchema.index({ category: 1 });
downloadFileSchema.index({ isPublished: 1 });
downloadFileSchema.index({ downloads: -1 });
downloadFileSchema.index({ views: -1 });

module.exports = mongoose.model("DownloadFile", downloadFileSchema);
