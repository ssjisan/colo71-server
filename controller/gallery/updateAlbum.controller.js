const fs = require("fs/promises");
const path = require("path");

const GalleryAlbum = require("../../model/galleryModel");
const {
  STORAGE_ROOT,
  MAX_FILE_SIZE,
} = require("../../middlewares/uploadMiddleware");

const TEMP_GALLERY_ROOT = path.join(STORAGE_ROOT, "temp", "gallery");
const PERMANENT_GALLERY_ROOT = path.join(STORAGE_ROOT, "gallery");

const MAX_IMAGES = 50;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

const createHttpError = (message, statusCode) =>
  Object.assign(new Error(message), { statusCode });

const isInside = (parent, target) => {
  const relative = path.relative(parent, target);

  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
};

const getFilename = (image) =>
  typeof image === "string" ? image : image?.filename || "";

const validateFileMetadata = (file) => {
  if (
    !file ||
    typeof file.filename !== "string" ||
    typeof file.originalName !== "string" ||
    typeof file.mimeType !== "string"
  ) {
    throw createHttpError("Invalid uploaded file metadata.", 400);
  }

  const extension = path.extname(file.filename).toLowerCase();
  const originalExtension = path.extname(file.originalName).toLowerCase();

  if (
    path.basename(file.filename) !== file.filename ||
    !/^[a-f0-9-]{36}\.[a-z0-9]+$/i.test(file.filename) ||
    !ALLOWED_EXTENSIONS.has(extension) ||
    !ALLOWED_IMAGE_TYPES.has(file.mimeType) ||
    originalExtension !== extension
  ) {
    throw createHttpError(
      "Invalid file information in the upload session.",
      400,
    );
  }

  if (
    !Number.isSafeInteger(file.size) ||
    file.size < 1 ||
    file.size > MAX_FILE_SIZE
  ) {
    throw createHttpError(
      "Each image must be greater than 0 bytes and no larger than 2 MB.",
      400,
    );
  }
};

const readJsonArray = (value, fieldName) => {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw createHttpError(`${fieldName} must be valid JSON.`, 400);
    }
  }

  if (!Array.isArray(value)) {
    throw createHttpError(`${fieldName} must be an array.`, 400);
  }

  return value;
};

const updateAlbum = async (req, res, next) => {
  const movedFiles = [];
  const removedFiles = [];
  let thumbnailBackup = null;
  let newThumbnailPath = null;
  let sessionDir = null;
  let albumDir = null;
  let saved = false;

  try {
    const { id } = req.params;
    const { name } = req.body || {};

    if (!/^[a-f\d]{24}$/i.test(id || "")) {
      throw createHttpError("Invalid album ID.", 400);
    }

    if (typeof name !== "string" || !name.trim()) {
      throw createHttpError("Album name is required.", 400);
    }

    const albumName = name.trim();

    if (albumName.length > 150) {
      throw createHttpError("Album name cannot exceed 150 characters.", 400);
    }

    const album = await GalleryAlbum.findById(id);

    if (!album) {
      throw createHttpError("Album not found.", 404);
    }

    albumDir = path.resolve(PERMANENT_GALLERY_ROOT, album.slug);

    if (!isInside(PERMANENT_GALLERY_ROOT, albumDir)) {
      throw createHttpError("Invalid album storage path.", 400);
    }

    const existingImages = album.images || [];
    const existingByFilename = new Map(
      existingImages.map((image) => [image.filename, image]),
    );

    const removeImages = readJsonArray(
      req.body.removeImages ?? [],
      "removeImages",
    );

    const imageOrder = readJsonArray(req.body.imageOrder, "imageOrder");

    const removeSet = new Set();

    for (const filename of removeImages) {
      if (
        typeof filename !== "string" ||
        path.basename(filename) !== filename ||
        !existingByFilename.has(filename) ||
        removeSet.has(filename)
      ) {
        throw createHttpError(
          `Invalid image selected for removal: ${filename}`,
          400,
        );
      }

      removeSet.add(filename);
    }

    const sessionId =
      req.get("x-upload-session-id") || req.body.sessionId || "";

    let metadata = null;

    // An upload session is optional when only editing the title,
    // removing/reordering old images, or keeping the current thumbnail.
    if (sessionId) {
      if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
        throw createHttpError("Invalid upload session ID.", 400);
      }

      sessionDir = path.resolve(TEMP_GALLERY_ROOT, sessionId);

      if (path.dirname(sessionDir) !== path.resolve(TEMP_GALLERY_ROOT)) {
        throw createHttpError("Invalid upload session.", 400);
      }

      try {
        metadata = JSON.parse(
          await fs.readFile(path.join(sessionDir, "session.json"), "utf8"),
        );
      } catch {
        throw createHttpError(
          "Upload session was not found or is invalid.",
          404,
        );
      }

      if (metadata.sessionId !== sessionId) {
        throw createHttpError("Invalid upload session.", 400);
      }

      const adminId = String(req.user?._id || req.user?.id || "");

      if (!adminId || String(metadata.adminId) !== adminId) {
        throw createHttpError("You do not own this upload session.", 403);
      }

      const expiresAt = new Date(metadata.expiresAt).getTime();

      if (
        metadata.status !== "pending" ||
        !Number.isFinite(expiresAt) ||
        Date.now() >= expiresAt
      ) {
        throw createHttpError(
          "Upload session expired or is no longer active.",
          410,
        );
      }

      if (!Array.isArray(metadata.images)) {
        throw createHttpError("Invalid upload session images.", 400);
      }
    }

    const sessionImages = metadata?.images || [];
    const sessionImagesByFilename = new Map(
      sessionImages.map((image) => [image.filename, image]),
    );

    // Validate the final image order. It must contain every retained
    // existing image and every new image, exactly once.
    const seen = new Set();
    const finalImages = [];

    for (let index = 0; index < imageOrder.length; index += 1) {
      const entry = imageOrder[index];
      const filename = typeof entry === "string" ? entry : entry?.filename;

      if (
        typeof filename !== "string" ||
        path.basename(filename) !== filename ||
        seen.has(filename)
      ) {
        throw createHttpError("Invalid gallery image order.", 400);
      }

      seen.add(filename);

      if (existingByFilename.has(filename)) {
        if (removeSet.has(filename)) {
          throw createHttpError(
            `Removed image cannot appear in imageOrder: ${filename}`,
            400,
          );
        }

        const oldImage = existingByFilename.get(filename);

        finalImages.push({
          filename: oldImage.filename,
          originalName: oldImage.originalName,
          path: oldImage.path,
          mimeType: oldImage.mimeType,
          size: oldImage.size,
          order: index,
        });

        continue;
      }

      const newImage = sessionImagesByFilename.get(filename);

      if (!newImage) {
        throw createHttpError(
          `Image does not belong to this album or upload session: ${filename}`,
          400,
        );
      }

      validateFileMetadata(newImage);

      finalImages.push({
        filename: newImage.filename,
        originalName: newImage.originalName,
        path: path.posix.join("gallery", album.slug, newImage.filename),
        mimeType: newImage.mimeType,
        size: newImage.size,
        order: index,
      });
    }

    if (finalImages.length < 1 || finalImages.length > MAX_IMAGES) {
      throw createHttpError(
        `An album must contain 1 to ${MAX_IMAGES} images.`,
        400,
      );
    }

    // Every retained existing image must be present in the final order.
    for (const image of existingImages) {
      if (!removeSet.has(image.filename) && !seen.has(image.filename)) {
        throw createHttpError(
          `Missing retained image from imageOrder: ${image.filename}`,
          400,
        );
      }
    }

    // Identify images that are genuinely new.
    const newImages = finalImages.filter(
      (image) => !existingByFilename.has(image.filename),
    );

    // A thumbnail is replaced only if the session contains a new one.
    const newThumbnail = metadata?.thumbnail || null;

    if (newThumbnail) {
      validateFileMetadata(newThumbnail);
    }

    // Validate all new files before moving any of them.
    const filesToMove = [...newImages, ...(newThumbnail ? [newThumbnail] : [])];

    for (const file of filesToMove) {
      const source = path.resolve(sessionDir, file.filename);

      if (!isInside(sessionDir, source)) {
        throw createHttpError("Invalid uploaded file path.", 400);
      }

      const stat = await fs.stat(source).catch(() => null);

      if (
        !stat?.isFile() ||
        stat.size !== file.size ||
        stat.size < 1 ||
        stat.size > MAX_FILE_SIZE
      ) {
        throw createHttpError(
          `Uploaded file is missing or invalid: ${file.originalName}`,
          400,
        );
      }
    }

    await fs.mkdir(albumDir, { recursive: true });

    // Move new gallery images into the permanent album folder.
    for (const image of newImages) {
      const source = path.join(sessionDir, image.filename);
      const destination = path.join(albumDir, image.filename);

      try {
        await fs.access(destination);
        throw createHttpError(`File already exists: ${image.filename}`, 409);
      } catch (error) {
        if (error.statusCode) throw error;
        if (error.code !== "ENOENT") throw error;
      }

      await fs.rename(source, destination);
      movedFiles.push({ source, destination });
    }

    // Replace the thumbnail using the same permanent filename convention
    // as createAlbum: thumbnail.jpg, thumbnail.png, etc.
    let nextThumbnail = album.thumbnail;

    if (newThumbnail) {
      const extension = path.extname(newThumbnail.filename).toLowerCase();
      const filename = `thumbnail${extension}`;
      const destination = path.join(albumDir, filename);
      const source = path.join(sessionDir, newThumbnail.filename);

      if (path.resolve(albumDir) !== path.resolve(path.dirname(destination))) {
        throw createHttpError("Invalid thumbnail destination.", 400);
      }

      const oldThumbnailPath = path.resolve(STORAGE_ROOT, album.thumbnail.path);

      if (!isInside(albumDir, oldThumbnailPath)) {
        throw createHttpError("Invalid existing thumbnail path.", 400);
      }

      // Temporarily preserve the old thumbnail so it can be restored
      // if saving the album to MongoDB fails.
      try {
        await fs.access(oldThumbnailPath);

        thumbnailBackup = path.join(
          albumDir,
          `.thumbnail-backup-${Date.now()}`,
        );

        await fs.rename(oldThumbnailPath, thumbnailBackup);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }

      await fs.rename(source, destination);
      newThumbnailPath = destination;
      movedFiles.push({ source, destination });

      nextThumbnail = {
        filename,
        originalName: newThumbnail.originalName,
        path: path.posix.join("gallery", album.slug, filename),
        mimeType: newThumbnail.mimeType,
        size: newThumbnail.size,
      };
    }

    // Record removed image paths for deletion only after the DB save.
    for (const image of existingImages) {
      if (removeSet.has(image.filename)) {
        const imagePath = path.resolve(STORAGE_ROOT, image.path);

        if (!isInside(albumDir, imagePath)) {
          throw createHttpError("Invalid existing image path.", 400);
        }

        removedFiles.push(imagePath);
      }
    }

    // Save album metadata.
    album.name = albumName;
    album.images = finalImages;
    album.thumbnail = nextThumbnail;

    await album.save();
    saved = true;

    // Clean up the old thumbnail and removed images after the DB succeeds.
    for (const filePath of removedFiles) {
      await fs.rm(filePath, { force: true });
    }

    if (thumbnailBackup) {
      await fs.rm(thumbnailBackup, { force: true });
      thumbnailBackup = null;
    }

    // Remove the upload session after the album update succeeds.
    let cleanupPending = false;

    if (sessionDir) {
      try {
        await fs.rm(sessionDir, { recursive: true, force: true });
      } catch (error) {
        cleanupPending = true;
        console.error(
          "Album updated, but upload-session cleanup failed:",
          sessionId,
          error,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: cleanupPending
        ? "Album updated, but temporary cleanup needs retrying."
        : "Album updated successfully.",
      data: {
        album,
        cleanupPending,
      },
    });
  } catch (error) {
    if (!saved) {
      // Remove new permanent files and restore them to the session.
      for (const file of [...movedFiles].reverse()) {
        try {
          await fs.rename(file.destination, file.source);
        } catch (rollbackError) {
          console.error(
            "Failed to restore uploaded file:",
            file.destination,
            rollbackError,
          );
        }
      }

      // Restore the original thumbnail if it was moved aside.
      if (thumbnailBackup && albumDir) {
        try {
          const album = await GalleryAlbum.findById(req.params.id);

          if (album?.thumbnail?.path) {
            const originalPath = path.resolve(
              STORAGE_ROOT,
              album.thumbnail.path,
            );

            await fs.rename(thumbnailBackup, originalPath);
          }
        } catch (rollbackError) {
          console.error("Failed to restore thumbnail:", rollbackError);
        }
      }
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update gallery album error:", error);
    return next(error);
  }
};

module.exports = updateAlbum;
