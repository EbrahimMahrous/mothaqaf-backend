const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    name: { type: String, required: true },
    type: { type: String, enum: ["image", "file"], required: true },
    size: { type: Number, default: 0 },
    mime: { type: String, default: "" },
  },
  { _id: false },
);

const campaignSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    html: { type: String, required: true },
    audience: {
      type: String,
      enum: ["all", "lists", "manual"],
      default: "all",
    },
    listIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubscriberList" }],
    manualEmails: [{ type: String, lowercase: true, trim: true }],
    attachments: { type: [attachmentSchema], default: [] },
    recipientsCount: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "sending", "sent", "partial", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Campaign", campaignSchema);
