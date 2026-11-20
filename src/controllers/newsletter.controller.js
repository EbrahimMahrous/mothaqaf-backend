const Subscriber = require("../models/Subscriber");
const SubscriberList = require("../models/SubscriberList");
const Campaign = require("../models/Campaign");
const { sendBulkEmail, upsertContact } = require("../utils/mailer");

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

const paginate = (query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

const pagedResponse = (items, total, page, limit) => ({
  success: true,
  count: items.length,
  total,
  page,
  pages: Math.ceil(total / limit) || 1,
  data: items,
});

async function resolveAudience({ audience, listIds, manualEmails }) {
  if (audience === "all") {
    return await Subscriber.find({ status: "active" }).select("email").lean();
  }
  if (audience === "lists") {
    const ids = Array.isArray(listIds) ? listIds : [];
    if (ids.length === 0) return [];
    return await Subscriber.find({ status: "active", lists: { $in: ids } })
      .select("email")
      .lean();
  }
  if (audience === "manual") {
    return (manualEmails || [])
      .map((e) => String(e).toLowerCase().trim())
      .filter((e) => /^\S+@\S+\.\S+$/.test(e))
      .map((email) => ({ email }));
  }
  return [];
}

async function syncListCount(listId) {
  const count = await Subscriber.countDocuments({ lists: listId });
  await SubscriberList.findByIdAndUpdate(listId, { subscriberCount: count });
  return count;
}

// ═══════════════════════════════════════════════════════════
// SUBSCRIBERS
// ═══════════════════════════════════════════════════════════

exports.subscribe = async (req, res, next) => {
  try {
    const { email, name } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "الإيميل مطلوب" });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Subscriber.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.status === "unsubscribed") {
        existing.status = "active";
        if (name) existing.name = String(name).trim();
        await existing.save();
        upsertContact(normalizedEmail).catch((err) =>
          console.error("Brevo upsert failed:", err.message),
        );
        return res.json({
          success: true,
          message: "تم إعادة تفعيل الاشتراك",
          data: existing,
        });
      }
      return res
        .status(400)
        .json({ success: false, message: "الإيميل مشترك بالفعل" });
    }

    const subscriber = await Subscriber.create({
      email: normalizedEmail,
      name: name ? String(name).trim() : "",
      source: "website",
    });
    upsertContact(normalizedEmail).catch((err) =>
      console.error("Brevo upsert failed:", err.message),
    );

    res
      .status(201)
      .json({ success: true, message: "تم الاشتراك بنجاح", data: subscriber });
  } catch (err) {
    next(err);
  }
};

exports.getSubscribers = async (req, res, next) => {
  try {
    const { q = "", status, listId } = req.query;
    const { page, limit, skip } = paginate(req.query);

    const filter = {};
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }
    if (status === "active" || status === "unsubscribed")
      filter.status = status;
    if (listId) filter.lists = listId;

    const [items, total] = await Promise.all([
      Subscriber.find(filter)
        .populate("lists", "name color")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Subscriber.countDocuments(filter),
    ]);
    res.json(pagedResponse(items, total, page, limit));
  } catch (err) {
    next(err);
  }
};

exports.updateSubscriber = async (req, res, next) => {
  try {
    const { name, status, notes, tags } = req.body;
    const sub = await Subscriber.findById(req.params.id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "المشترك غير موجود" });

    if (name !== undefined) sub.name = String(name).trim();
    if (status && ["active", "unsubscribed"].includes(status))
      sub.status = status;
    if (notes !== undefined) sub.notes = String(notes);
    if (Array.isArray(tags)) sub.tags = tags;

    await sub.save();
    res.json({ success: true, message: "تم التحديث", data: sub });
  } catch (err) {
    next(err);
  }
};

exports.removeSubscriber = async (req, res, next) => {
  try {
    const sub = await Subscriber.findByIdAndDelete(req.params.id);
    if (!sub)
      return res
        .status(404)
        .json({ success: false, message: "المشترك غير موجود" });

    // Update list counts
    if (sub.lists?.length) {
      for (const id of sub.lists) await syncListCount(id);
    }
    res.json({ success: true, message: "تم حذف المشترك" });
  } catch (err) {
    next(err);
  }
};

exports.importSubscribers = async (req, res, next) => {
  try {
    const { emails, listId, tags } = req.body;
    if (!Array.isArray(emails) || emails.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "محتاج مصفوفة إيميلات" });
    }
    const normalized = [
      ...new Set(emails.map((e) => String(e).toLowerCase().trim())),
    ].filter((e) => /^\S+@\S+\.\S+$/.test(e));
    if (normalized.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "مفيش إيميلات صحيحة" });
    }

    let added = 0,
      skipped = 0;
    for (const email of normalized) {
      const exists = await Subscriber.findOne({ email });
      if (exists) {
        skipped++;
        continue;
      }
      const doc = {
        email,
        source: "import",
        tags: Array.isArray(tags) ? tags : [],
      };
      if (listId) doc.lists = [listId];
      await Subscriber.create(doc);
      upsertContact(email).catch(() => {});
      added++;
    }
    if (listId) await syncListCount(listId);

    res.json({
      success: true,
      message: `تم إضافة ${added} وتجاهل ${skipped}`,
      data: { added, skipped },
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// LISTS
// ═══════════════════════════════════════════════════════════

exports.getLists = async (req, res, next) => {
  try {
    const lists = await SubscriberList.find().sort({ createdAt: -1 });
    res.json({ success: true, count: lists.length, data: lists });
  } catch (err) {
    next(err);
  }
};

exports.createList = async (req, res, next) => {
  try {
    const { name, description, color, tags } = req.body;
    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "اسم القائمة مطلوب" });
    }
    const exists = await SubscriberList.findOne({ name: name.trim() });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "فيه قائمة بنفس الاسم" });

    const list = await SubscriberList.create({
      name: name.trim(),
      description: description || "",
      color: color || "#1e6b3a",
      tags: tags || [],
    });
    res
      .status(201)
      .json({ success: true, message: "تم إنشاء القائمة", data: list });
  } catch (err) {
    next(err);
  }
};

exports.updateList = async (req, res, next) => {
  try {
    const { name, description, color, tags } = req.body;
    const list = await SubscriberList.findById(req.params.id);
    if (!list)
      return res
        .status(404)
        .json({ success: false, message: "القائمة غير موجودة" });

    if (name) list.name = name.trim();
    if (description !== undefined) list.description = description;
    if (color) list.color = color;
    if (Array.isArray(tags)) list.tags = tags;
    await list.save();
    res.json({ success: true, message: "تم تحديث القائمة", data: list });
  } catch (err) {
    next(err);
  }
};

exports.removeList = async (req, res, next) => {
  try {
    const list = await SubscriberList.findByIdAndDelete(req.params.id);
    if (!list)
      return res
        .status(404)
        .json({ success: false, message: "القائمة غير موجودة" });

    await Subscriber.updateMany(
      { lists: list._id },
      { $pull: { lists: list._id } },
    );
    res.json({ success: true, message: "تم حذف القائمة" });
  } catch (err) {
    next(err);
  }
};

exports.addSubscribersToList = async (req, res, next) => {
  try {
    const { subscriberIds } = req.body;
    if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "اختار مشتركين أولاً" });
    }
    const list = await SubscriberList.findById(req.params.id);
    if (!list)
      return res
        .status(404)
        .json({ success: false, message: "القائمة غير موجودة" });

    await Subscriber.updateMany(
      { _id: { $in: subscriberIds } },
      { $addToSet: { lists: list._id } },
    );
    const count = await syncListCount(list._id);
    res.json({ success: true, message: "تم إضافة المشتركين", data: { count } });
  } catch (err) {
    next(err);
  }
};

exports.removeSubscribersFromList = async (req, res, next) => {
  try {
    const { subscriberIds } = req.body;
    if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "اختار مشتركين أولاً" });
    }
    const list = await SubscriberList.findById(req.params.id);
    if (!list)
      return res
        .status(404)
        .json({ success: false, message: "القائمة غير موجودة" });

    await Subscriber.updateMany(
      { _id: { $in: subscriberIds } },
      { $pull: { lists: list._id } },
    );
    const count = await syncListCount(list._id);
    res.json({ success: true, message: "تم إزالة المشتركين", data: { count } });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// CAMPAIGNS
// ═══════════════════════════════════════════════════════════

exports.sendNewsletter = async (req, res, next) => {
  try {
    const {
      subject,
      html,
      audience = "all",
      listIds = [],
      manualEmails = [],
      attachments = [],
    } = req.body;

    if (!subject?.trim() || !html?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "العنوان والمحتوى مطلوبين" });
    }

    const recipients = await resolveAudience({
      audience,
      listIds,
      manualEmails,
    });
    if (recipients.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "مفيش مستلمين مطابقين" });
    }

    const campaign = await Campaign.create({
      subject: subject.trim(),
      html,
      audience,
      listIds,
      manualEmails,
      attachments,
      recipientsCount: recipients.length,
      status: "sending",
    });

    const emails = recipients.map((r) => r.email);
    const result = await sendBulkEmail({ emails, subject, html, attachments });

    campaign.sent = result.sent;
    campaign.failed = result.failed;
    campaign.status =
      result.failed === 0 ? "sent" : result.sent === 0 ? "failed" : "partial";
    await campaign.save();

    await Subscriber.updateMany(
      { email: { $in: emails } },
      { $set: { lastSentAt: new Date() } },
    );

    res.json({
      success: true,
      message: `تم إرسال ${result.sent} من ${recipients.length}`,
      data: campaign,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCampaigns = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const { page, limit, skip } = paginate(req.query);
    const filter = {};
    if (q) filter.subject = { $regex: q, $options: "i" };

    const [items, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Campaign.countDocuments(filter),
    ]);
    res.json(pagedResponse(items, total, page, limit));
  } catch (err) {
    next(err);
  }
};

exports.getCampaignById = async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign)
      return res
        .status(404)
        .json({ success: false, message: "الحملة غير موجودة" });
    res.json({ success: true, data: campaign });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// UPLOADS
// ═══════════════════════════════════════════════════════════

exports.uploadCampaignAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "لازم ترفع ملف" });
    }
    const isImage = req.file.mimetype?.startsWith("image/");
    res.status(201).json({
      success: true,
      message: "تم رفع المرفق",
      data: {
        url: req.file.path,
        publicId: req.file.filename,
        name: req.file.originalname,
        size: req.file.size || 0,
        mime: req.file.mimetype || "",
        type: isImage ? "image" : "file",
      },
    });
  } catch (err) {
    next(err);
  }
};
