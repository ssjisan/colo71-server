const fs = require("fs/promises");
const path = require("path");

const removeAlbumImage = async (req, res, next) => {
  try {
    const sessionId = req.get("x-upload-session-id");
    const { filename } = req.body || {};

    if (!sessionId || !/^[a-f0-9-]{36}$/i.test(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "A valid upload session ID is required.",
      });
    }

    if (typeof filename !== "string" || path.basename(filename) !== filename) {
      return res.status(400).json({
        success: false,
        message: "Invalid image filename.",
      });
    }

    const { STORAGE_ROOT } = require("../../middlewares/uploadMiddleware");

    const tempRoot = path.resolve(STORAGE_ROOT, "gallery", "temp");
    const sessionDir = path.resolve(tempRoot, sessionId);

    if (path.dirname(sessionDir) !== tempRoot) {
      return res.status(400).json({
        success: false,
        message: "Invalid upload session.",
      });
    }

    const manifestPath = path.join(sessionDir, "session.json");
    const metadata = JSON.parse(await fs.readFile(manifestPath, "utf8"));

    if (
      metadata.sessionId !== sessionId ||
      metadata.status !== "pending" ||
      !Number.isFinite(new Date(metadata.expiresAt).getTime()) ||
      Date.now() >= new Date(metadata.expiresAt).getTime()
    ) {
      return res.status(410).json({
        success: false,
        message: "Upload session expired or is no longer active.",
      });
    }

    const imageIndex = (metadata.images || []).findIndex(
      (image) => image.filename === filename,
    );

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Image not found in this upload session.",
      });
    }

    await fs.rm(path.join(sessionDir, filename), { force: true });

    metadata.images.splice(imageIndex, 1);
    metadata.images = metadata.images.map((image, index) => ({
      ...image,
      order: index,
    }));
    metadata.updatedAt = new Date().toISOString();

    await fs.writeFile(manifestPath, JSON.stringify(metadata, null, 2), "utf8");

    return res.status(200).json({
      success: true,
      message: "Image removed successfully.",
      data: {
        images: metadata.images,
        imageCount: metadata.images.length,
      },
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "Upload session or image not found.",
      });
    }

    return next(error);
  }
};

module.exports = removeAlbumImage;
