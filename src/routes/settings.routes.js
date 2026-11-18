const express = require("express");
const { protect } = require("../middleware/auth");
const { uploadImage } = require("../middleware/upload");
const ctrl = require("../controllers/settings.controller");

const router = express.Router();

router.get("/", ctrl.getSettings);
router.put("/", protect, ctrl.updateSettings);
router.put("/logo", protect, uploadImage.single("logo"), ctrl.updateLogo);

module.exports = router;
