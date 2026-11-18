const Subscriber = require("../models/Subscriber");
const Campaign = require("../models/Campaign");
const { sendBulkEmail, upsertContact } = require("../utils/mailer");

// ─── Subscribe (public) ────────────────────────────────────
exports.subscribe = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "الإيميل مطلوب" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Subscriber.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.status === "unsubscribed") {
        existing.status = "active";
        await existing.save();

        // Re-add to Brevo Contacts (non-blocking)
        upsertContact(normalizedEmail).catch((err) =>
          console.error("Brevo upsert failed:", err.message),
        );

        return res.json({
          success: true,
          message: "تم إعادة تفعيل الاشتراك",
          data: existing,
        });
      }
      return res.status(400).json({
        success: false,
        message: "الإيميل مشترك بالفعل",
      });
    }

    // Save to MongoDB
    const subscriber = await Subscriber.create({ email: normalizedEmail });

    // Add to Brevo Contacts (non-blocking — won't fail the request)
    upsertContact(normalizedEmail).catch((err) =>
      console.error("Brevo upsert failed:", err.message),
    );

    res.status(201).json({
      success: true,
      message: "تم الاشتراك بنجاح",
      data: subscriber,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get all subscribers (admin) ───────────────────────────
exports.getSubscribers = async (req, res, next) => {
  try {
    const subs = await Subscriber.find().sort({ createdAt: -1 });
    res.json({ success: true, count: subs.length, data: subs });
  } catch (err) {
    next(err);
  }
};

// ─── Remove subscriber (admin) ─────────────────────────────
exports.removeSubscriber = async (req, res, next) => {
  try {
    const sub = await Subscriber.findByIdAndDelete(req.params.id);
    if (!sub) {
      return res
        .status(404)
        .json({ success: false, message: "المشترك غير موجود" });
    }
    res.json({ success: true, message: "تم حذف المشترك" });
  } catch (err) {
    next(err);
  }
};

// ─── Send newsletter (admin) ───────────────────────────────
exports.sendNewsletter = async (req, res, next) => {
  try {
    const { subject, html } = req.body;
    if (!subject || !html) {
      return res
        .status(400)
        .json({ success: false, message: "العنوان والمحتوى مطلوبين" });
    }

    const subs = await Subscriber.find({ status: "active" });
    if (subs.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "مفيش مشتركين نشطين" });
    }

    // Create campaign record first (so we can track failures)
    const campaign = await Campaign.create({
      subject,
      html,
      recipientsCount: subs.length,
    });

    const emails = subs.map((s) => s.email);
    const result = await sendBulkEmail({ emails, subject, html });

    campaign.sent = result.sent;
    campaign.failed = result.failed;
    campaign.status =
      result.failed === 0 ? "sent" : result.sent === 0 ? "failed" : "partial";
    await campaign.save();

    res.json({
      success: true,
      message: `تم إرسال ${result.sent} من ${subs.length}`,
      data: campaign,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get all campaigns (admin) ─────────────────────────────
exports.getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, data: campaigns });
  } catch (err) {
    next(err);
  }
};
