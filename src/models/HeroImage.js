const mongoose = require("mongoose");

const heroImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: "" },

    title: { type: String, default: "" },
    description: { type: String, default: "" },
    badge: {
      type: String,
      enum: ["", "new", "featured", "video"],
      default: "",
    },
    order: { type: Number, default: 0 },

    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DownloadFile",
      default: null,
    },
    videoUrl: { type: String, default: "" },

    ctaLabel: { type: String, default: "" },
    ctaHref: { type: String, default: "" },

    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true },
);

heroImageSchema.index({ order: 1 });
heroImageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("HeroImage", heroImageSchema);
