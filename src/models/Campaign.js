const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    html: { type: String, required: true },
    recipientsCount: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "sent", "partial", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Campaign", campaignSchema);
