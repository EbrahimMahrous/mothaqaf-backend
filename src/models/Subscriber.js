const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "الإيميل مطلوب"],
      unique: true, // This automatically creates an index
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "صيغة الإيميل غير صحيحة"],
    },
    name: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["active", "unsubscribed"],
      default: "active",
    },
    lists: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubscriberList" }],
    tags: [{ type: String, trim: true }],
    source: { type: String, default: "website" },
    lastSentAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

// ❌ Remove this line — the 'email' field has `unique: true` (which automatically creates an index)
// subscriberSchema.index({ email: 1 });

// ✅Leave these indexes as they are (they don't have duplicate definitions).
subscriberSchema.index({ lists: 1 });
subscriberSchema.index({ status: 1 });

module.exports = mongoose.model("Subscriber", subscriberSchema);
