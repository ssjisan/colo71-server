const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const STORAGE_ROOT =
  process.env.STORAGE_PATH || path.resolve(__dirname, "../../file-storage");

const TEMP_GALLERY_ROOT = path.join(STORAGE_ROOT, "gallery", "temp");

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGES = 50;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

const ALLOWED_TYPES = new Set([
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

const isValidSessionId = (sessionId) =>
  typeof sessionId === "string" && /^[a-f0-9-]{36}$/i.test(sessionId);

const readSessionMetadata = async (sessionDir) => {
  const manifestPath = path.join(sessionDir, "session.json");

  try {
    return JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError) {
      throw createHttpError("Upload session not found.", 404);
    }

    throw error;
  }
};

const validateSession = (metadata, sessionId) => {
  if (metadata.sessionId !== sessionId) {
    throw createHttpError("Invalid upload session.", 400);
  }

  if (
    metadata.status !== "pending" ||
    !Number.isFinite(new Date(metadata.expiresAt).getTime()) ||
    Date.now() >= new Date(metadata.expiresAt).getTime()
  ) {
    throw createHttpError(
      "Upload session expired or is no longer active.",
      410,
    );
  }
};

const createImageUpload = ({
  fields,
  maxFiles = MAX_IMAGES + 1,
  maxImages = MAX_IMAGES,
}) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, callback) => {
        callback(null, req.uploadTempDir);
      },

      filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();

        callback(null, `${crypto.randomUUID()}${extension}`);
      },
    }),

    limits: {
      fileSize: MAX_FILE_SIZE,
      files: maxFiles,
      fields: 10,
      parts: maxFiles + 10,
    },

    fileFilter: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();

      if (
        !ALLOWED_TYPES.has(file.mimetype) ||
        !ALLOWED_EXTENSIONS.has(extension)
      ) {
        return callback(
          createHttpError(
            "Only JPG, PNG, WEBP, GIF, and AVIF images are allowed.",
            400,
          ),
        );
      }

      callback(null, true);
    },
  });

  // Create a new temporary session or resume an existing one.
  const prepareSession = async (req, res, next) => {
    try {
      await fs.mkdir(TEMP_GALLERY_ROOT, { recursive: true });

      let sessionId = req.get("x-upload-session-id");
      let sessionDir;
      let metadata;

      if (sessionId) {
        if (!isValidSessionId(sessionId)) {
          throw createHttpError("Invalid upload session ID.", 400);
        }

        sessionDir = path.join(TEMP_GALLERY_ROOT, sessionId);
        metadata = await readSessionMetadata(sessionDir);

        validateSession(metadata, sessionId);
      } else {
        sessionId = crypto.randomUUID();
        sessionDir = path.join(TEMP_GALLERY_ROOT, sessionId);

        await fs.mkdir(sessionDir);

        const createdAt = new Date();

        metadata = {
          sessionId,
          createdAt: createdAt.toISOString(),
          expiresAt: new Date(
            createdAt.getTime() + SESSION_TTL_MS,
          ).toISOString(),
          status: "pending",
          thumbnail: null,
          images: [],
        };

        try {
          await fs.writeFile(
            path.join(sessionDir, "session.json"),
            JSON.stringify(metadata, null, 2),
            { encoding: "utf8", flag: "wx" },
          );
        } catch (error) {
          await fs.rm(sessionDir, {
            recursive: true,
            force: true,
          });

          throw error;
        }
      }

      req.uploadSessionId = sessionId;
      req.uploadTempDir = sessionDir;
      req.uploadMetadata = metadata;

      return next();
    } catch (error) {
      return next(error);
    }
  };

  // Parse multipart files after the temporary session is prepared.
  const parseFiles = (req, res, next) => {
    upload.fields(fields)(req, res, async (error) => {
      if (error) {
        return next(error);
      }

      const uploadedFiles = Object.values(req.files || {}).flat();

      try {
        const existingImages = req.uploadMetadata.images || [];
        const newImages = req.files?.images || [];

        if (existingImages.length + newImages.length > maxImages) {
          await Promise.all(
            uploadedFiles.map((file) =>
              fs.rm(file.path, { force: true }).catch(() => {}),
            ),
          );

          throw createHttpError(
            `An album cannot contain more than ${maxImages} images.`,
            400,
          );
        }

        return next();
      } catch (validationError) {
        return next(validationError);
      }
    });
  };

  return [prepareSession, parseFiles];
};

module.exports = {
  createImageUpload,
  STORAGE_ROOT,
  MAX_FILE_SIZE,
};
