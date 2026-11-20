const mongoose = require("mongoose");

const subscriberListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#1e6b3a" },
    tags: [{ type: String, trim: true }],
    subscriberCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("SubscriberList", subscriberListSchema);
