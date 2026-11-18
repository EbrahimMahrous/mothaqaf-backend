const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "main", unique: true },
    logo: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    social: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      linkedin: { type: String, default: "" },
    },
    whatsapp: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
  },
  { timestamps: true },
);

settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ singleton: "main" });
  if (!settings) settings = await this.create({ singleton: "main" });
  return settings;
};

module.exports = mongoose.model("Settings", settingsSchema);
