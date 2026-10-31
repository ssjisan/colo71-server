const fs = require("fs/promises");
const path = require("path");

const GalleryAlbum = require("../../model/galleryModel");
const {
  STORAGE_ROOT,
  MAX_FILE_SIZE,
} = require("../../middlewares/uploadMiddleware");

const TEMP_GALLERY_ROOT = path.join(STORAGE_ROOT, "gallery", "temp");
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

const createSlug = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const validateFileMetadata = (file) => {
  if (
    !file ||
    typeof file.filename !== "string" ||
    typeof file.originalName !== "string"
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

const moveFile = async (source, destination, movedFiles) => {
  await fs.rename(source, destination);

  movedFiles.push({ source, destination });
};

const createAlbum = async (req, res, next) => {
  let sessionDir;
  let albumDir;
  const movedFiles = [];
  let albumCreated = false;

  try {
    const { name } = req.body || {};
    const sessionId = req.get("x-upload-session-id") || req.body?.sessionId;

    // Validate album name.
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Album name is required.",
      });
    }

    const albumName = name.trim();

    if (albumName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Album name cannot exceed 150 characters.",
      });
    }

    // Validate the session ID.
    if (typeof sessionId !== "string" || !/^[a-f0-9-]{36}$/i.test(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "A valid upload session ID is required.",
      });
    }

    sessionDir = path.resolve(TEMP_GALLERY_ROOT, sessionId);

    // Ensure the session directory stays inside the temporary gallery root.
    if (path.dirname(sessionDir) !== path.resolve(TEMP_GALLERY_ROOT)) {
      return res.status(400).json({
        success: false,
        message: "Invalid upload session.",
      });
    }

    const manifestPath = path.join(sessionDir, "session.json");
    let metadata;

    try {
      metadata = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    } catch (error) {
      if (error.code === "ENOENT" || error instanceof SyntaxError) {
        return res.status(404).json({
          success: false,
          message: "Upload session not found or invalid.",
        });
      }

      throw error;
    }

    // Verify that the manifest belongs to this session.
    if (metadata.sessionId !== sessionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid upload session.",
      });
    }

    // No adminId ownership check here. Route authentication is handled
    // by the existing requiredSignIn middleware.

    // Verify the session is still active.
    const expiresAt = new Date(metadata.expiresAt).getTime();

    if (
      metadata.status !== "pending" ||
      !Number.isFinite(expiresAt) ||
      Date.now() >= expiresAt
    ) {
      return res.status(410).json({
        success: false,
        message: "Upload session expired or is no longer active.",
      });
    }

    // Validate the thumbnail and gallery images.
    if (!metadata.thumbnail) {
      return res.status(400).json({
        success: false,
        message: "Please upload an album thumbnail.",
      });
    }

    if (
      !Array.isArray(metadata.images) ||
      metadata.images.length < 1 ||
      metadata.images.length > MAX_IMAGES
    ) {
      return res.status(400).json({
        success: false,
        message: `An album must contain 1 to ${MAX_IMAGES} images.`,
      });
    }

    validateFileMetadata(metadata.thumbnail);
    metadata.images.forEach(validateFileMetadata);

    // Create a safe slug for the permanent directory.
    const slug = createSlug(albumName);

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Album name must contain letters or numbers.",
      });
    }

    // Check whether the album slug already exists.
    const existingAlbum = await GalleryAlbum.findOne({ slug })
      .select("_id")
      .lean();

    if (existingAlbum) {
      return res.status(409).json({
        success: false,
        message: "An album with this name already exists.",
      });
    }

    // Validate that every file exists and matches its manifest metadata.
    const validateStoredFile = async (file) => {
      const source = path.join(sessionDir, file.filename);
      const stat = await fs.stat(source);

      if (
        !stat.isFile() ||
        stat.size !== file.size ||
        stat.size < 1 ||
        stat.size > MAX_FILE_SIZE
      ) {
        throw createHttpError(
          `Uploaded file is missing or invalid: ${file.originalName}`,
          400,
        );
      }

      return source;
    };

    const thumbnailSource = await validateStoredFile(metadata.thumbnail);

    const imageSources = [];

    for (const image of metadata.images) {
      imageSources.push({
        image,
        source: await validateStoredFile(image),
      });
    }

    // Create the permanent album directory.
    await fs.mkdir(PERMANENT_GALLERY_ROOT, { recursive: true });

    albumDir = path.join(PERMANENT_GALLERY_ROOT, slug);

    // Never overwrite an existing directory.
    await fs.mkdir(albumDir);

    // Move the thumbnail.
    const thumbnailExtension = path
      .extname(metadata.thumbnail.filename)
      .toLowerCase();
    const thumbnailFilename = `thumbnail${thumbnailExtension}`;
    const thumbnailDestination = path.join(albumDir, thumbnailFilename);

    await moveFile(thumbnailSource, thumbnailDestination, movedFiles);

    // Honor the frontend's drag-and-drop order when supplied.
    let orderedImages = [...metadata.images];
    const requestedOrder = req.body?.order;

    if (requestedOrder !== undefined) {
      if (
        !Array.isArray(requestedOrder) ||
        requestedOrder.length !== metadata.images.length ||
        requestedOrder.some((filename) => typeof filename !== "string") ||
        new Set(requestedOrder).size !== requestedOrder.length
      ) {
        throw createHttpError("Invalid gallery image order.", 400);
      }

      const imagesByFilename = new Map(
        metadata.images.map((image) => [image.filename, image]),
      );

      if (requestedOrder.some((filename) => !imagesByFilename.has(filename))) {
        throw createHttpError(
          "The requested order contains an unknown image.",
          400,
        );
      }

      orderedImages = requestedOrder.map((filename) =>
        imagesByFilename.get(filename),
      );
    }

    const sourcesByFilename = new Map(
      imageSources.map(({ image, source }) => [image.filename, source]),
    );

    const savedImages = [];

    for (let index = 0; index < orderedImages.length; index += 1) {
      const image = orderedImages[index];
      const source = sourcesByFilename.get(image.filename);
      const destination = path.join(albumDir, image.filename);

      await moveFile(source, destination, movedFiles);

      savedImages.push({
        filename: image.filename,
        originalName: image.originalName,
        path: path.posix.join("gallery", slug, image.filename),
        mimeType: image.mimeType,
        size: image.size,
        order: index,
      });
    }

    // Save album metadata to MongoDB.
    const album = await GalleryAlbum.create({
      name: albumName,
      slug,
      thumbnail: {
        filename: thumbnailFilename,
        originalName: metadata.thumbnail.originalName,
        path: path.posix.join("gallery", slug, thumbnailFilename),
        mimeType: metadata.thumbnail.mimeType,
        size: metadata.thumbnail.size,
      },
      images: savedImages,
      status: "published",
    });

    albumCreated = true;

    // Remove the temporary session only after the database save succeeds.
    let cleanupPending = false;

    try {
      await fs.rm(sessionDir, {
        recursive: true,
        force: true,
      });
    } catch (cleanupError) {
      cleanupPending = true;

      console.error(
        "Album created, but temporary folder cleanup failed:",
        sessionId,
        cleanupError,
      );
    }

    return res.status(201).json({
      success: true,
      message: cleanupPending
        ? "Album created, but temporary cleanup needs retrying."
        : "Album created successfully.",
      data: {
        album,
        cleanupPending,
      },
    });
  } catch (error) {
    // Roll back moved files if the album was not saved.
    if (!albumCreated) {
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

      if (albumDir) {
        try {
          await fs.rmdir(albumDir);
        } catch {
          // Leave the directory in place if it is not empty.
        }
      }
    }

    if (error.code === "EEXIST" || error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An album with this name already exists.",
      });
    }

    return next(error);
  }
};

module.exports = createAlbum;
