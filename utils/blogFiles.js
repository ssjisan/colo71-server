const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const Blog = require("../model/blogModel");
const {
  STORAGE_ROOT,
  BLOG_ROOT,
  readSession,
} = require("../middlewares/blogUploadMiddleware");
const { walkImages, serializeContent } = require("./blogHtml");

const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

const publicUrl = (absolutePath) =>
  `/file-storage/${path
    .relative(STORAGE_ROOT, absolutePath)
    .split(path.sep)
    .join("/")}`;

function parseContentJSON(value) {
  let parsed = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw httpError("contentJSON must be valid JSON.");
    }
  }

  if (!Array.isArray(parsed) || !parsed.length) {
    throw httpError("contentJSON must be a non-empty Slate node array.");
  }

  return parsed;
}

async function uniqueSlug(title, currentId = null) {
  const base =
    String(title)
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 140) || "blog-post";

  let slug = base;
  let index = 2;

  while (
    await Blog.exists({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    })
  ) {
    slug = `${base}-${index++}`;
  }

  return slug;
}

async function getSession(req) {
  return readSession(req);
}

function filenameFromTempUrl(url, sessionId) {
  if (typeof url !== "string") return null;

  const prefix = `/file-storage/blog/temp/${sessionId}/editor-images/`;

  if (!url.startsWith(prefix)) return null;

  const filename = url.slice(prefix.length);

  if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|gif|avif)$/i.test(filename)) {
    throw httpError("Invalid editor image URL.");
  }

  return filename;
}

async function rollbackEditorMoves(result) {
  if (!result?.moves?.length) return;

  for (const move of [...result.moves].reverse()) {
    try {
      await fs.mkdir(path.dirname(move.source), { recursive: true });
      await fs.rename(move.destination, move.source);
    } catch (error) {
      console.error("Failed to roll back editor image:", error);
    }
  }

  if (result.editorDirectory) {
    await fs
      .rm(result.editorDirectory, {
        recursive: true,
        force: true,
      })
      .catch(() => {});
  }
}

async function finalizeEditorImages(contentJSON, session, storageKey) {
  const records = new Map(
    session.meta.editorImages.map((item) => [item.filename, item]),
  );

  const filenames = new Set();

  walkImages(contentJSON, (node) => {
    if (typeof node.url !== "string" || !node.url) {
      throw httpError("An editor image has no valid URL.");
    }

    const filename = filenameFromTempUrl(node.url, session.id);

    if (filename) {
      if (!records.has(filename)) {
        throw httpError(
          "An editor image does not belong to this upload session.",
          403,
        );
      }

      filenames.add(filename);
    }
  });

  const editorDirectory = path.join(BLOG_ROOT, storageKey, "editor");
  const moves = [];
  const finalUrls = new Map();

  try {
    if (filenames.size) {
      await fs.mkdir(editorDirectory, { recursive: true });
    }

    for (const filename of filenames) {
      const record = records.get(filename);

      const source = path.join(session.dir, "editor-images", filename);

      const destination = path.join(editorDirectory, filename);

      const stat = await fs.stat(source).catch(() => null);

      if (!stat?.isFile() || stat.size < 1 || stat.size !== record.size) {
        throw httpError(`Editor image is missing or invalid: ${filename}`);
      }

      if (stat.size > 2 * 1024 * 1024) {
        throw httpError(`Editor image exceeds the size limit: ${filename}`);
      }

      await fs.rename(source, destination);

      moves.push({ source, destination });

      finalUrls.set(filename, publicUrl(destination));
    }

    walkImages(contentJSON, (node) => {
      const filename = filenameFromTempUrl(node.url, session.id);

      if (filename && finalUrls.has(filename)) {
        node.url = finalUrls.get(filename);
      }

      if (node.url.includes("/file-storage/blog/temp/")) {
        throw httpError(
          "Editor contains an image from another or expired upload session.",
        );
      }
    });

    return {
      json: contentJSON,
      html: serializeContent(contentJSON),
      moves,
      editorDirectory,
    };
  } catch (error) {
    await rollbackEditorMoves({ moves, editorDirectory });
    throw error;
  }
}

async function saveSubmittedCover(file, storageKey) {
  if (!file) return null;

  if (!Buffer.isBuffer(file.buffer)) {
    throw httpError("Invalid cover image upload.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw httpError("Cover image exceeds the 5 MB limit.", 413);
  }

  const extension = path.extname(file.originalname).toLowerCase();

  const allowedExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".avif",
  ]);

  if (!allowedExtensions.has(extension)) {
    throw httpError("Invalid cover image extension.");
  }

  const directory = path.join(BLOG_ROOT, storageKey, "cover");
  const filename = `${crypto.randomUUID()}${extension}`;
  const destination = path.join(directory, filename);

  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.writeFile(destination, file.buffer, { flag: "wx" });
  } catch (error) {
    await fs.rm(destination, { force: true }).catch(() => {});
    throw error;
  }

  return {
    destination,
    url: publicUrl(destination),
  };
}

async function removeSession(session) {
  if (!session?.dir) return;

  await fs.rm(session.dir, {
    recursive: true,
    force: true,
  });
}

async function removeBlogFiles(blog) {
  if (!blog?.storageKey) return;

  await fs.rm(path.join(BLOG_ROOT, blog.storageKey), {
    recursive: true,
    force: true,
  });
}

module.exports = {
  STORAGE_ROOT,
  BLOG_ROOT,
  parseContentJSON,
  uniqueSlug,
  getSession,
  finalizeEditorImages,
  saveSubmittedCover,
  rollbackEditorMoves,
  removeSession,
  removeBlogFiles,
  publicUrl,
};
