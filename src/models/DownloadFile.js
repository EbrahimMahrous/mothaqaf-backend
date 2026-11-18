const mongoose = require("mongoose");

const downloadFileSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "العنوان مطلوب"], trim: true },
    description: { type: String, default: "" },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    size: { type: Number, default: 0 },
    format: { type: String, default: "" },
    downloads: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("DownloadFile", downloadFileSchema);
