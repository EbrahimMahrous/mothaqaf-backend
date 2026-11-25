const express = require("express");
const { protect } = require("../middleware/auth");
const { uploadFile, uploadImage } = require("../middleware/upload");
const ctrl = require("../controllers/files.controller");

const router = express.Router();

// Public
router.get("/", ctrl.getAll);
router.get("/stats", protect, ctrl.getStats);
router.get("/:id", ctrl.getById);
router.get("/:id/view", ctrl.view);
router.get("/:id/download", ctrl.download);

// Admin
router.post("/", protect, uploadFile.single("file"), ctrl.upload);
router.post("/bulk", protect, uploadFile.array("files", 10), ctrl.uploadMany);
router.post(
  "/:id/cover",
  protect,
  uploadImage.single("image"),
  ctrl.uploadCover,
);
router.patch("/:id", protect, ctrl.update);
router.delete("/:id", protect, ctrl.remove);

module.exports = router;
