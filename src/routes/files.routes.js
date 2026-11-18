const express = require("express");
const { protect } = require("../middleware/auth");
const { uploadFile } = require("../middleware/upload");
const ctrl = require("../controllers/files.controller");

const router = express.Router();

router.get("/", ctrl.getAll);
router.post("/", protect, uploadFile.single("file"), ctrl.upload);
router.get("/:id/download", ctrl.download);
router.delete("/:id", protect, ctrl.remove);

module.exports = router;
