const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const { STORAGE_ROOT } = require("../../middlewares/uploadMiddleware");

const TEMP_GALLERY_ROOT = path.join(STORAGE_ROOT, "temp", "gallery");

const SESSION_EXPIRY_HOURS = 24;

const createUploadSession = async (req, res, next) => {
  let sessionDir;

  try {
    // Require an authenticated admin.
    // Adjust these fields to match your existing auth middleware.
    const adminId = req.user?._id || req.user?.id;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Authentication is required to start an upload session.",
      });
    }

    // Create the parent directory if it does not exist.
    await fs.mkdir(TEMP_GALLERY_ROOT, {
      recursive: true,
    });

    // Generate a unique ID for this album upload session.
    const sessionId = crypto.randomUUID();

    sessionDir = path.join(TEMP_GALLERY_ROOT, sessionId);

    // Create a new, isolated directory for this session.
    await fs.mkdir(sessionDir);

    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    // Store session metadata outside the public web directory.
    const sessionMetadata = {
      sessionId,
      adminId: String(adminId),
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "pending",
      thumbnail: null,
      images: [],
    };

    await fs.writeFile(
      path.join(sessionDir, "session.json"),
      JSON.stringify(sessionMetadata, null, 2),
      {
        encoding: "utf8",
        flag: "wx",
      },
    );

    return res.status(201).json({
      success: true,
      message: "Upload session created successfully.",
      data: {
        sessionId,
        expiresAt: expiresAt.toISOString(),
        maxImages: 50,
        maxFileSize: 2 * 1024 * 1024,
      },
    });
  } catch (error) {
    // Avoid leaving an incomplete session directory behind.
    if (sessionDir) {
      try {
        await fs.rm(sessionDir, {
          recursive: true,
          force: true,
        });
      } catch (cleanupError) {
        console.error("Failed to clean up upload session:", cleanupError);
      }
    }

    next(error);
  }
};

module.exports = createUploadSession;
