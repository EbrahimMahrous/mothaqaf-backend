const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const { uploadAttachment } = require("../middleware/upload");
const ctrl = require("../controllers/newsletter.controller");

const router = express.Router();

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: "محاولات اشتراك كتير، جرب بعد ساعة" },
});

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors
        .array()
        .map((e) => e.msg)
        .join(", "),
    });
  }
  next();
};

// ─── Public ────────────────────────────────────────────────
router.post(
  "/subscribe",
  subscribeLimiter,
  [body("email").isEmail().withMessage("إيميل غير صالح")],
  validate,
  ctrl.subscribe,
);

// ─── Subscribers (admin) ───────────────────────────────────
router.get("/subscribers", protect, ctrl.getSubscribers);
router.patch("/subscribers/:id", protect, ctrl.updateSubscriber);
router.delete("/subscribers/:id", protect, ctrl.removeSubscriber);
router.post("/subscribers/import", protect, ctrl.importSubscribers);

// ─── Lists (admin) ─────────────────────────────────────────
router.get("/lists", protect, ctrl.getLists);
router.post("/lists", protect, ctrl.createList);
router.patch("/lists/:id", protect, ctrl.updateList);
router.delete("/lists/:id", protect, ctrl.removeList);
router.post("/lists/:id/add", protect, ctrl.addSubscribersToList);
router.post("/lists/:id/remove", protect, ctrl.removeSubscribersFromList);

// ─── Campaigns (admin) ─────────────────────────────────────
router.post("/send", protect, ctrl.sendNewsletter);
router.get("/campaigns", protect, ctrl.getCampaigns);
router.get("/campaigns/:id", protect, ctrl.getCampaignById);

// ─── Attachments (admin) ───────────────────────────────────
router.post(
  "/attachments",
  protect,
  uploadAttachment.single("file"),
  ctrl.uploadCampaignAttachment,
);

module.exports = router;
