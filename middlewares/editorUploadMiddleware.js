const multer = require("multer");
const path = require("path");
const fs = require("fs");

const STORAGE_ROOT =
  process.env.STORAGE_PATH ||
  path.resolve(__dirname, "../../file-storage");

const EDITOR_IMAGE_DIR = path.join(
  STORAGE_ROOT,
  "editor",
  "images"
);

fs.mkdirSync(EDITOR_IMAGE_DIR, { recursive: true });

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, EDITOR_IMAGE_DIR);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `editor-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${extension}`;

    cb(null, filename);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP, GIF and AVIF images are allowed."));
    }

    cb(null, true);
  },
});

const uploadEditorImage = upload.single("image");

module.exports = {
  uploadEditorImage,
  STORAGE_ROOT,
  EDITOR_IMAGE_DIR,
};