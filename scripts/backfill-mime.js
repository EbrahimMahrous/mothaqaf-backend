/**
 * One-off script: fix mimeType + format for existing DownloadFile docs.
 * Usage: node scripts/backfill-mime.js
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const DownloadFile = require("../src/models/DownloadFile");

const MIME_BY_EXT = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  rar: "application/vnd.rar",
  txt: "text/plain",
};

(async () => {
  await connectDB();
  const docs = await DownloadFile.find();
  let fixed = 0;

  for (const doc of docs) {
    const extFromUrl = (doc.url || "").split("?")[0].split(".").pop();
    const format = (doc.format || extFromUrl || "").toLowerCase();
    const mime = MIME_BY_EXT[format];
    if (!format || !mime) continue;

    let changed = false;
    if (doc.format !== format) {
      doc.format = format;
      changed = true;
    }
    if (!doc.mimeType || doc.mimeType === "application/octet-stream") {
      doc.mimeType = mime;
      changed = true;
    }
    if (changed) {
      await doc.save();
      fixed++;
      console.log(`✓ fixed ${doc._id} → ${format} / ${mime}`);
    }
  }

  console.log(`\nDone. Fixed ${fixed}/${docs.length} files.`);
  await mongoose.disconnect();
  process.exit(0);
})();
