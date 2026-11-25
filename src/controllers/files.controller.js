const DownloadFile = require("../models/DownloadFile");
const cloudinary = require("../config/cloudinary");

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const MIME_BY_EXT = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  rar: "application/vnd.rar",
  txt: "text/plain",
};

function resolveMime(fileDoc) {
  if (fileDoc.mimeType && fileDoc.mimeType !== "application/octet-stream") {
    return fileDoc.mimeType;
  }
  const ext = (fileDoc.format || "").toLowerCase().replace(/^\./, "");
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

function buildFilename(title, format, publicId) {
  const base = (title || publicId || "file")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  const ext = (format || "").replace(/^\./, "");
  return ext ? `${base}.${ext}` : base;
}

function contentDisposition(type, filename) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(
    filename,
  )}`;
}

async function fetchWithTimeout(url, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } catch (err) {
    const reason =
      err.name === "AbortError"
        ? `timeout after ${ms}ms`
        : err.cause?.message || err.message;
    console.error(`[fetchWithTimeout] ${url} → ${reason}`);
    throw new Error(`تعذر الاتصال بمصدر الملف: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

async function streamToResponse(upstream, res) {
  const len = upstream.headers.get("content-length");
  if (len) res.setHeader("Content-Length", len);

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

// ═══════════════════════════════════════════════════════════
// Public endpoints
// ═══════════════════════════════════════════════════════════

exports.getAll = async (req, res, next) => {
  try {
    const { q = "", category, sort = "-createdAt" } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    const filter = { isPublished: true };
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { tags: { $in: [new RegExp(q, "i")] } },
      ];
    }
    if (category && category !== "all") filter.category = category;

    const sortMap = {
      "-createdAt": { createdAt: -1 },
      createdAt: { createdAt: 1 },
      "-downloads": { downloads: -1 },
      downloads: { downloads: 1 },
      "-views": { views: -1 },
      views: { views: 1 },
      "-size": { size: -1 },
    };
    const sortBy = sortMap[sort] || { createdAt: -1 };

    const [items, total] = await Promise.all([
      DownloadFile.find(filter).sort(sortBy).skip(skip).limit(limit),
      DownloadFile.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: items.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: items,
    });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const [result] = await DownloadFile.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalDownloads: { $sum: "$downloads" },
          totalViews: { $sum: "$views" },
          totalSize: { $sum: "$size" },
        },
      },
    ]);

    const byCategory = await DownloadFile.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const topFiles = await DownloadFile.find()
      .sort({ downloads: -1 })
      .limit(5)
      .select("title downloads views format size category");

    res.json({
      success: true,
      data: {
        totalFiles: result?.totalFiles || 0,
        totalDownloads: result?.totalDownloads || 0,
        totalViews: result?.totalViews || 0,
        totalSize: result?.totalSize || 0,
        byCategory: byCategory.reduce(
          (acc, c) => ({ ...acc, [c._id]: c.count }),
          {},
        ),
        topFiles,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const file = await DownloadFile.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { returnDocument: "after" },
    );
    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "الملف غير موجود" });
    }
    res.json({ success: true, data: file });
  } catch (err) {
    next(err);
  }
};

exports.view = async (req, res, next) => {
  try {
    const fileDoc = await DownloadFile.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { returnDocument: "after" },
    );
    if (!fileDoc) {
      return res
        .status(404)
        .json({ success: false, message: "الملف غير موجود" });
    }

    const mime = resolveMime(fileDoc);
    const filename = buildFilename(
      fileDoc.title,
      fileDoc.format,
      fileDoc.publicId,
    );

    const canInline = mime === "application/pdf" || mime.startsWith("image/");

    const upstream = await fetchWithTimeout(fileDoc.url);
    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: `تعذر جلب الملف من المصدر (${upstream.status})`,
      });
    }

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      contentDisposition(canInline ? "inline" : "attachment", filename),
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=300");

    await streamToResponse(upstream, res);
  } catch (err) {
    next(err);
  }
};

exports.download = async (req, res, next) => {
  try {
    const fileDoc = await DownloadFile.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { returnDocument: "after" },
    );
    if (!fileDoc) {
      return res
        .status(404)
        .json({ success: false, message: "الملف غير موجود" });
    }

    const mime = resolveMime(fileDoc);
    const filename = buildFilename(
      fileDoc.title,
      fileDoc.format,
      fileDoc.publicId,
    );

    const upstream = await fetchWithTimeout(fileDoc.url);
    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: `تعذر تحميل الملف من المصدر (${upstream.status})`,
      });
    }

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      contentDisposition("attachment", filename),
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");

    await streamToResponse(upstream, res);
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// Admin endpoints
// ═══════════════════════════════════════════════════════════

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "لازم ترفع ملف" });
    }
    const {
      title,
      description,
      category,
      tags,
      coverImage,
      videoUrl,
      isNew: isNewFlag,
      isFeatured,
      isPublished,
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "العنوان مطلوب" });
    }

    const originalExt = (req.file.originalname || "")
      .split(".")
      .pop()
      .toLowerCase();
    const format = (req.file.format || originalExt || "").toLowerCase() || "";

    const mimeType =
      req.file.mimetype && req.file.mimetype !== "application/octet-stream"
        ? req.file.mimetype
        : MIME_BY_EXT[format] || "application/octet-stream";

    const fileDoc = await DownloadFile.create({
      title,
      description: description || "",
      url: req.file.path,
      publicId: req.file.filename,
      size: req.file.size || 0,
      format,
      mimeType,
      category: category || "other",
      tags: tags
        ? String(tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      coverImage: coverImage || "",
      videoUrl: videoUrl || "",
      isNew: isNewFlag === "true" || isNewFlag === true,
      isFeatured: isFeatured === "true" || isFeatured === true,
      isPublished: isPublished !== "false",
      uploadedBy: req.admin?._id,
    });

    res
      .status(201)
      .json({ success: true, message: "تم رفع الملف", data: fileDoc });
  } catch (err) {
    next(err);
  }
};

exports.uploadMany = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "لازم ترفع ملفات" });
    }
    const { category } = req.body;
    const results = [];

    for (const file of req.files) {
      try {
        const title = file.originalname.replace(/\.[^/.]+$/, "").trim();
        const originalExt = (file.originalname || "")
          .split(".")
          .pop()
          .toLowerCase();
        const format = (file.format || originalExt || "").toLowerCase();
        const mimeType =
          file.mimetype && file.mimetype !== "application/octet-stream"
            ? file.mimetype
            : MIME_BY_EXT[format] || "application/octet-stream";

        const doc = await DownloadFile.create({
          title: title || "ملف بدون عنوان",
          url: file.path,
          publicId: file.filename,
          size: file.size || 0,
          format,
          mimeType,
          category: category || "other",
          isPublished: true,
          uploadedBy: req.admin?._id,
        });
        results.push(doc);
      } catch (err) {
        console.error("Bulk upload item failed:", err.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `تم رفع ${results.length} ملف`,
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const {
      title,
      description,
      category,
      tags,
      coverImage,
      videoUrl,
      isNew: isNewFlag,
      isFeatured,
      isPublished,
      order,
    } = req.body;

    const file = await DownloadFile.findById(req.params.id);
    if (!file) {
      return res
        .status(404)
        .json({ success: false, message: "الملف غير موجود" });
    }

    if (title !== undefined) file.title = title;
    if (description !== undefined) file.description = description;
    if (category !== undefined) file.category = category;
    if (tags !== undefined) {
      file.tags = Array.isArray(tags)
        ? tags
        : String(tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }
    if (coverImage !== undefined) file.coverImage = coverImage;
    if (videoUrl !== undefined) file.videoUrl = videoUrl;
    if (isNewFlag !== undefined)
      file.isNew = isNewFlag === "true" || isNewFlag === true;
    if (isFeatured !== undefined)
      file.isFeatured = isFeatured === "true" || isFeatured === true;
    if (isPublished !== undefined) file.isPublished = isPublished !== "false";
    if (order !== undefined) file.order = Number(order);

    await file.save();
    res.json({ success: true, message: "تم تحديث الملف", data: file });
  } catch (err) {
    next(err);
  }
};

// POST /api/files/:id/cover — upload cover image (admin)
exports.uploadCover = async (req, res, next) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "لازم ترفع صورة" });
    }

    const fileDoc = await DownloadFile.findById(req.params.id);
    if (!fileDoc) {
      return res
        .status(404)
        .json({ success: false, message: "الملف غير موجود" });
    }

    // Delete the old cover from Cloudinary if it's one of ours
    if (fileDoc.coverImage && fileDoc.coverImage.includes("cloudinary.com")) {
      try {
        const match = fileDoc.coverImage.match(
          /\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i,
        );
        if (match?.[1]) {
          await cloudinary.uploader.destroy(match[1]);
        }
      } catch (e) {
        console.warn("Old cover delete failed (ignored):", e.message);
      }
    }

    fileDoc.coverImage = req.file.path;
    await fileDoc.save();

    res.json({
      success: true,
      message: "تم رفع صورة الغلاف",
      data: fileDoc,
    });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const fileDoc = await DownloadFile.findById(req.params.id);
    if (!fileDoc) {
      return res
        .status(404)
        .json({ success: false, message: "الملف غير موجود" });
    }
    // PDFs are stored as "image" on Cloudinary, others as "raw".
    const isPdf = /\.pdf($|\?)/i.test(fileDoc.url || "");
    try {
      await cloudinary.uploader.destroy(fileDoc.publicId, {
        resource_type: isPdf ? "image" : "raw",
      });
    } catch (e) {
      // Fallback: try the other resource type.
      try {
        await cloudinary.uploader.destroy(fileDoc.publicId, {
          resource_type: isPdf ? "raw" : "image",
        });
      } catch (e2) {
        console.warn("Cloudinary delete failed (ignored):", e2.message);
      }
    }
    await fileDoc.deleteOne();
    res.json({ success: true, message: "تم حذف الملف" });
  } catch (err) {
    next(err);
  }
};
