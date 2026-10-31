const fs = require("fs/promises");
const path = require("path");
const {
  readSession,
  writeManifest,
} = require("../../middlewares/caseStudyUploadMiddleware");

async function removeEditorImage(req, res, next) {
  try {
    const session = await readSession(req);
    const filename = req.params.filename;
    if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|gif|avif)$/i.test(filename)) {
      return res.status(400).json({ success: false, message: "Invalid editor image filename." });
    }

    const index = session.meta.editorImages.findIndex((item) => item.filename === filename);
    if (index < 0) {
      return res.status(404).json({ success: false, message: "Editor image not found in this session." });
    }

    await fs.rm(path.join(session.dir, "editor-images", filename), { force: true });
    session.meta.editorImages.splice(index, 1);
    await writeManifest(session);
    return res.json({ success: true, message: "Temporary editor image removed." });
  } catch (error) {
    return next(error);
  }
}

async function discardSession(req, res, next) {
  try {
    const session = await readSession(req);
    await fs.rm(session.dir, { recursive: true, force: true });
    return res.json({ success: true, message: "Upload session discarded." });
  } catch (error) {
    return next(error);
  }
}

module.exports = { removeEditorImage, discardSession };
