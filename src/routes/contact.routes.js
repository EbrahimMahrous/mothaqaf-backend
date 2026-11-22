const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/contact.controller");

const router = express.Router();

// Rate limit: 5 messages per hour per IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: "محاولات كتير، جرب بعد ساعة" },
});

router.post("/", contactLimiter, ctrl.submit);
router.get("/", protect, ctrl.getAll);
router.patch("/:id", protect, ctrl.updateStatus);
router.delete("/:id", protect, ctrl.remove);

module.exports = router;
