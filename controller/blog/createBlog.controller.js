const fs = require("fs/promises");
const Blog = require("../../model/blogModel");

const {
  parseContentJSON,
  uniqueSlug,
  getSession,
  finalizeEditorImages,
  saveSubmittedCover,
  rollbackEditorMoves,
  removeSession,
} = require("../../utils/blogFiles");

const { serializeContent } = require("../../utils/blogHtml");

const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

function asBoolean(value, fallback = false) {
  if (value === undefined) return fallback;

  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  throw httpError("featured and published must be boolean values.");
}

module.exports = async function createBlog(req, res, next) {
  let blog;
  let session;
  let editorMoves;
  let cover;
  let databaseSaved = false;

  try {
    const title = String(req.body.title || "").trim();
    const excerpt = String(req.body.excerpt || "").trim();

    if (!title) {
      throw httpError("Title is required.");
    }

    if (title.length > 200 || excerpt.length > 500) {
      throw httpError("Title or excerpt exceeds its maximum length.");
    }

    const contentJSON = parseContentJSON(req.body.contentJSON);

    session = await getSession(req);

    const published = asBoolean(req.body.published);
    const featured = asBoolean(req.body.featured);

    const slug = await uniqueSlug(title);

    blog = new Blog({
      title,
      slug,
      storageKey: slug,
      excerpt,
      contentJSON,
      contentHTML: serializeContent(contentJSON),
      coverPhoto: null,
      featured,
      published,
      publishedAt: published ? new Date() : null,
    });

    editorMoves = await finalizeEditorImages(
      blog.contentJSON,
      session,
      blog.storageKey,
    );

    cover = await saveSubmittedCover(req.file, blog.storageKey);

    blog.contentJSON = editorMoves.json;
    blog.contentHTML = editorMoves.html;
    blog.coverPhoto = cover?.url || null;

    await blog.save();
    databaseSaved = true;

    // Remove temporary uploads only after MongoDB successfully saves.
    await removeSession(session).catch((error) => {
      console.error("Failed to remove blog upload session:", error);
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully.",
      data: blog,
    });
  } catch (error) {
    if (!databaseSaved) {
      await rollbackEditorMoves(editorMoves);

      if (cover?.destination) {
        await fs.rm(cover.destination, { force: true }).catch(() => {});
      }

      // Remove the partially created folder if it is empty.
      if (blog?.storageKey) {
        const blogDirectory = require("path").join(
          require("../../middlewares/blogUploadMiddleware").BLOG_ROOT,
          blog.storageKey,
        );

        await fs
          .rm(blogDirectory, {
            recursive: true,
            force: true,
          })
          .catch(() => {});
      }

      if (blog?._id) {
        await Blog.deleteOne({ _id: blog._id }).catch(() => {});
      }
    }

    return next(error);
  }
};
