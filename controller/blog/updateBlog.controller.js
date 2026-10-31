const fs = require('fs/promises');
const Blog = require('../../model/blogModel');
const { parseContentJSON, uniqueSlug, getSession, finalizeEditorImages, saveSubmittedCover, rollbackEditorMoves, removeSession, removeOldCover } = require('../../utils/blogFiles');
const { serializeContent } = require('../../utils/blogHtml');
const httpError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });
function asBoolean(value, fallback) { if (value === undefined) return fallback; if (value === true || value === 'true') return true; if (value === false || value === 'false') return false; throw httpError('featured and published must be boolean values.'); }
module.exports = async function updateBlog(req, res, next) {
  let blog; let original; let session; let editorMoves; let cover; let databaseSaved = false;
  try {
    blog = await Blog.findById(req.params.id); if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    original = blog.toObject({ depopulate: true });
    const hadContent = req.body.contentJSON !== undefined;
    session = await getSession(req, hadContent);
    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim(); if (!title || title.length > 200) throw httpError('Title must contain 1 to 200 characters.');
      blog.title = title; blog.slug = await uniqueSlug(title, blog._id);
      // storageKey intentionally stays stable if the title/slug changes, so existing asset URLs never break.
    }
    if (req.body.excerpt !== undefined) { const excerpt = String(req.body.excerpt).trim(); if (excerpt.length > 500) throw httpError('Excerpt cannot exceed 500 characters.'); blog.excerpt = excerpt; }
    const wasPublished = blog.published; blog.featured = asBoolean(req.body.featured, blog.featured); blog.published = asBoolean(req.body.published, blog.published);
    if (!wasPublished && blog.published) blog.publishedAt = new Date(); if (wasPublished && !blog.published) blog.publishedAt = null;
    if (hadContent) blog.contentJSON = parseContentJSON(req.body.contentJSON);
    if (req.body.removeCover === 'true' || req.body.removeCover === true) blog.coverPhoto = null;
    if (hadContent) { editorMoves = await finalizeEditorImages(blog.contentJSON, session, blog.storageKey || blog.slug); blog.contentJSON = editorMoves.json; blog.contentHTML = editorMoves.html; }
    if (req.file) { cover = await saveSubmittedCover(req.file, blog.storageKey || blog.slug); blog.coverPhoto = cover.url; }
    await blog.save();
    databaseSaved = true;
    if (original.coverPhoto && original.coverPhoto !== blog.coverPhoto) await removeOldCover(original.coverPhoto).catch(() => {});
    if (session) await removeSession(session).catch(() => {});
    return res.json({ success: true, message: 'Blog updated successfully.', data: blog });
  } catch (error) {
    if (!databaseSaved) {
      await rollbackEditorMoves(editorMoves);
      if (cover?.destination) await fs.rm(cover.destination, { force: true }).catch(() => {});
      if (blog && original) blog.set(original);
    }
    return next(error);
  }
};
