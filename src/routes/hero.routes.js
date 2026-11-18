const express = require("express");
const { protect } = require("../middleware/auth");
const { uploadImage } = require("../middleware/upload");
const ctrl = require("../controllers/hero.controller");

const router = express.Router();

router.get("/", ctrl.getAll);
router.post("/", protect, uploadImage.single("image"), ctrl.upload);
router.patch(
  "/:id/replace",
  protect,
  uploadImage.single("image"),
  ctrl.replace,
);
router.delete("/:id", protect, ctrl.remove);

module.exports = router;
