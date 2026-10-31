const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

const STORAGE_ROOT = path.resolve(
  process.env.STORAGE_PATH || path.resolve(__dirname, "../../file-storage"),
);
const BLOG_ROOT = path.join(STORAGE_ROOT, "blog");
const TEMP_ROOT = path.join(BLOG_ROOT, "temp");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_EDITOR_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_COVER_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_EDITOR_IMAGES = 50;
const MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

async function ensureStorage() {
  await fs.mkdir(TEMP_ROOT, { recursive: true });
}
function sessionPath(id) {
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/i.test(id))
    throw httpError("A valid upload session ID is required.");
  const target = path.resolve(TEMP_ROOT, id);
  if (path.dirname(target) !== path.resolve(TEMP_ROOT))
    throw httpError("Invalid upload session ID.");
  return target;
}
function getSessionId(req) {
  return req.get("x-upload-session-id") || req.body?.sessionId || "";
}
async function readSession(req) {
  const id = getSessionId(req);
  if (!id) throw httpError("X-Upload-Session-Id header is required.");
  const dir = sessionPath(id);
  console.log("[SESSION FILE CHECK]", {
  directory: dir,
  exists: await fs
    .access(path.join(dir, "session.json"))
    .then(() => true)
    .catch(() => false),
});
  let meta;
  try {
    meta = JSON.parse(
      await fs.readFile(path.join(dir, "session.json"), "utf8"),
    );
  } catch (e) {
    if (e.code === "ENOENT" || e instanceof SyntaxError)
      throw httpError("Upload session not found.", 404);
    throw e;
  }
  if (meta.sessionId !== id || meta.status !== "pending")
    throw httpError("Upload session is invalid or inactive.", 410);
  const expiry = Date.parse(meta.expiresAt);
  if (!Number.isFinite(expiry) || Date.now() >= expiry)
    throw httpError("Upload session expired. Start a new session.", 410);
  return { id, dir, meta };
}
async function writeManifest(session) {
  await fs.writeFile(
    path.join(session.dir, "session.json"),
    JSON.stringify(session.meta, null, 2),
  );
}
async function createSession(req, res, next) {
  try {
    await ensureStorage();
    const id = crypto.randomUUID();
    const dir = sessionPath(id);
    await fs.mkdir(path.join(dir, "editor-images"), { recursive: true });
    const now = Date.now();
    const meta = {
      sessionId: id,
      status: "pending",
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
      editorImages: [],
    };
    await writeManifest({ id, dir, meta });
    return res.status(201).json({
      success: true,
      data: { sessionId: id, expiresAt: meta.expiresAt },
    });
  } catch (e) {
    return next(e);
  }
}
function imageFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!MIME_TYPES.has(file.mimetype) || !EXTENSIONS.has(ext))
    return cb(
      httpError("Only JPG, PNG, WEBP, GIF, and AVIF images are allowed."),
    );
  return cb(null, true);
}
const editorImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) =>
      cb(null, path.join(req.blogUploadSession.dir, "editor-images")),
    filename: (req, file, cb) =>
      cb(
        null,
        `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: MAX_EDITOR_IMAGE_SIZE, files: 1 },
  fileFilter: imageFilter,
}).single("image");
// Cover is received in memory on submit/update; it is never written to temp storage.
const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_COVER_IMAGE_SIZE,
    files: 1,
    fields: 20,
    fieldSize: 10 * 1024 * 1024,
  },
  fileFilter: imageFilter,
}).single("coverPhoto");
function uploadCoverOnSubmit(req, res, next) {
  coverUpload(req, res, (e) => {
    if (!e) return next();
    if (e.code === "LIMIT_FILE_SIZE") e.statusCode = 413;
    else if (e instanceof multer.MulterError) e.statusCode = 400;
    return next(e);
  });
}
async function uploadEditorImage(req, res, next) {
  try {
    const session = await readSession(req);
    if (session.meta.editorImages.length >= MAX_EDITOR_IMAGES)
      throw httpError(
        `A maximum of ${MAX_EDITOR_IMAGES} editor images is allowed per session.`,
        413,
      );
    req.blogUploadSession = session;
    editorImageUpload(req, res, async (e) => {
      if (e) {
        if (e.code === "LIMIT_FILE_SIZE") e.statusCode = 413;
        else if (e instanceof multer.MulterError) e.statusCode = 400;
        return next(e);
      }
      try {
        if (!req.file) throw httpError("Please select an editor image.");
        const record = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: new Date().toISOString(),
        };
        session.meta.editorImages.push(record);
        await writeManifest(session);
        const url = `/file-storage/blog/temp/${session.id}/editor-images/${record.filename}`;
        return res
          .status(201)
          .json({ success: true, data: { ...record, url } });
      } catch (err) {
        if (req.file?.path)
          await fs.rm(req.file.path, { force: true }).catch(() => {});
        return next(err);
      }
    });
  } catch (e) {
    return next(e);
  }
}
async function removeEditorImage(req, res, next) {
  try {
    const session = await readSession(req);
    const filename = req.params.filename;
    if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|gif|avif)$/i.test(filename))
      throw httpError("Invalid editor image filename.");
    const index = session.meta.editorImages.findIndex(
      (x) => x.filename === filename,
    );
    if (index < 0)
      throw httpError("Editor image not found in this session.", 404);
    await fs.rm(path.join(session.dir, "editor-images", filename), {
      force: true,
    });
    session.meta.editorImages.splice(index, 1);
    await writeManifest(session);
    return res.json({
      success: true,
      message: "Temporary editor image removed.",
    });
  } catch (e) {
    return next(e);
  }
}
async function discardSession(req, res, next) {
  try {
    const session = await readSession(req);
    await fs.rm(session.dir, { recursive: true, force: true });
    return res.json({ success: true, message: "Upload session discarded." });
  } catch (e) {
    return next(e);
  }
}
module.exports = {
  STORAGE_ROOT,
  BLOG_ROOT,
  TEMP_ROOT,
  SESSION_TTL_MS,
  MAX_EDITOR_IMAGE_SIZE,
  MAX_COVER_IMAGE_SIZE,
  MAX_EDITOR_IMAGES,
  ensureStorage,
  sessionPath,
  readSession,
  writeManifest,
  createSession,
  uploadEditorImage,
  uploadCoverOnSubmit,
  removeEditorImage,
  discardSession,
};
