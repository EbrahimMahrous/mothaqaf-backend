const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
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

router.post(
  "/subscribe",
  subscribeLimiter,
  [body("email").isEmail().withMessage("إيميل غير صالح")],
  validate,
  ctrl.subscribe,
);
router.get("/subscribers", protect, ctrl.getSubscribers);
router.delete("/subscribers/:id", protect, ctrl.removeSubscriber);
router.post("/send", protect, ctrl.sendNewsletter);
router.get("/campaigns", protect, ctrl.getCampaigns);

module.exports = router;
