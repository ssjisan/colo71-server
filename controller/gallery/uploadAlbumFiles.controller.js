const fs = require("fs/promises");
const path = require("path");

const MAX_IMAGES = 50;
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const uploadAlbumFiles = async (req, res, next) => {
  const uploadedFiles = Object.values(req.files || {}).flat();

  try {
    const { uploadTempDir: sessionDir, uploadSessionId: sessionId } = req;

    if (!sessionDir || !sessionId) {
      throw Object.assign(new Error("Upload session was not initialized."), {
        statusCode: 400,
      });
    }

    const manifestPath = path.join(sessionDir, "session.json");

    const metadata = JSON.parse(await fs.readFile(manifestPath, "utf8"));

    // Validate session status and expiry.
    if (
      metadata.status !== "pending" ||
      !metadata.expiresAt ||
      Date.now() >= new Date(metadata.expiresAt).getTime()
    ) {
      throw Object.assign(
        new Error("Upload session has expired or is no longer active."),
        { statusCode: 410 },
      );
    }

    const existingImages = metadata.images || [];
    const newImages = req.files?.images || [];
    const newThumbnails = req.files?.thumbnail || [];

    // Validate image count.
    if (existingImages.length + newImages.length > MAX_IMAGES) {
      throw Object.assign(
        new Error(`An album cannot contain more than ${MAX_IMAGES} images.`),
        { statusCode: 400 },
      );
    }

    if (newThumbnails.length > 1) {
      throw Object.assign(
        new Error("Only one thumbnail is allowed per upload request."),
        { statusCode: 400 },
      );
    }

    // Validate uploaded file sizes.
    for (const file of uploadedFiles) {
      if (!file.size || file.size > MAX_FILE_SIZE) {
        throw Object.assign(
          new Error(
            "Each image must be greater than 0 bytes and no larger than 2 MB.",
          ),
          { statusCode: 400 },
        );
      }
    }

    // Keep the existing thumbnail if no replacement is uploaded.
    const previousThumbnail = metadata.thumbnail;

    const thumbnail = newThumbnails[0]
      ? {
          filename: newThumbnails[0].filename,
          originalName: newThumbnails[0].originalname,
          mimeType: newThumbnails[0].mimetype,
          size: newThumbnails[0].size,
        }
      : previousThumbnail || null;

    // Append newly uploaded images while preserving their order.
    const appendedImages = newImages.map((file, index) => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      order: existingImages.length + index,
    }));

    const updatedMetadata = {
      ...metadata,
      thumbnail,
      images: [...existingImages, ...appendedImages],
      updatedAt: new Date().toISOString(),
    };

    // Save metadata before deleting a replaced thumbnail.
    await fs.writeFile(
      manifestPath,
      JSON.stringify(updatedMetadata, null, 2),
      "utf8",
    );

    // Remove the old thumbnail only after the manifest is saved.
    if (
      newThumbnails.length > 0 &&
      previousThumbnail?.filename &&
      previousThumbnail.filename !== thumbnail.filename
    ) {
      await fs.rm(path.join(sessionDir, previousThumbnail.filename), {
        force: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Files uploaded successfully.",
      data: {
        sessionId,
        thumbnail: updatedMetadata.thumbnail,
        images: updatedMetadata.images,
        imageCount: updatedMetadata.images.length,
        maxImages: MAX_IMAGES,
      },
    });
  } catch (error) {
    // Remove files uploaded in this request if processing fails.
    await Promise.all(
      uploadedFiles.map((file) =>
        fs.rm(file.path, { force: true }).catch(() => {}),
      ),
    );

    return next(error);
  }
};

module.exports = uploadAlbumFiles;
