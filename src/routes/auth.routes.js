const express = require("express");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/auth.controller");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "محاولات كتير، جرب بعد 15 دقيقة" },
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
  "/login",
  loginLimiter,
  [
    body("email").isEmail().withMessage("إيميل غير صالح"),
    body("password").notEmpty(),
  ],
  validate,
  ctrl.login,
);
router.get("/me", protect, ctrl.getMe);
router.patch("/profile", protect, ctrl.updateProfile);
router.patch("/change-password", protect, ctrl.changePassword);

module.exports = router;
