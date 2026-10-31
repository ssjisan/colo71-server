const fs = require("fs/promises");
const CaseStudy = require("../../model/caseStudyModel");
const {
  parseContentJSON,
  uniqueSlug,
  getSession,
  finalizeEditorImages,
  saveSubmittedCover,
  rollbackEditorMoves,
  removeSession,
  removeOldCover,
  removeUnusedEditorImages,
} = require("../../utils/caseStudyFiles");

const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

function asBoolean(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  throw httpError("featured and published must be boolean values.");
}
function optionalText(value, field, maxLength) {
  const text = String(value ?? "").trim();
  if (text.length > maxLength) throw httpError(`${field} cannot exceed ${maxLength} characters.`);
  return text;
}

module.exports = async function updateCaseStudy(req, res, next) {
  let caseStudy;
  let original;
  let session;
  let editorMoves;
  let cover;
  let databaseSaved = false;

  try {
    caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) return res.status(404).json({ success: false, message: "Case study not found." });

    original = caseStudy.toObject({ depopulate: true });
    const hadContent = req.body.contentJSON !== undefined;

    // An upload session is required only when editor content is being submitted.
    if (hadContent) session = await getSession(req);

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();
      if (!title || title.length > 200) throw httpError("Title must contain 1 to 200 characters.");
      caseStudy.title = title;
      caseStudy.slug = await uniqueSlug(title, caseStudy._id);
    }
    if (req.body.summary !== undefined) caseStudy.summary = optionalText(req.body.summary, "Summary", 500);
    if (req.body.clientName !== undefined) caseStudy.clientName = optionalText(req.body.clientName, "Client name", 200);
    if (req.body.industry !== undefined) {
      caseStudy.industry = optionalText(req.body.industry, "Industry", 100);
      if (!caseStudy.industry) throw httpError("Industry is required.");
    }
    if (req.body.projectLocation !== undefined) caseStudy.projectLocation = optionalText(req.body.projectLocation, "Project location", 200);
    if (req.body.projectType !== undefined) {
      caseStudy.projectType = optionalText(req.body.projectType, "Project type", 120);
      if (!caseStudy.projectType) throw httpError("Project type is required.");
    }
    if (req.body.completionDate !== undefined) {
      if (!req.body.completionDate) caseStudy.completionDate = null;
      else {
        const date = new Date(req.body.completionDate);
        if (Number.isNaN(date.getTime())) throw httpError("Completion date is invalid.");
        caseStudy.completionDate = date;
      }
    }

    const wasPublished = caseStudy.published;
    caseStudy.featured = asBoolean(req.body.featured, caseStudy.featured);
    caseStudy.published = asBoolean(req.body.published, caseStudy.published);
    if (!wasPublished && caseStudy.published) caseStudy.publishedAt = new Date();
    if (wasPublished && !caseStudy.published) caseStudy.publishedAt = null;

    if (hadContent) caseStudy.contentJSON = parseContentJSON(req.body.contentJSON);

    if (req.body.removeCover === "true" || req.body.removeCover === true) {
      caseStudy.coverPhoto = null;
    }

    if (hadContent) {
      editorMoves = await finalizeEditorImages(
        caseStudy.contentJSON,
        session,
        caseStudy.storageKey || caseStudy.slug,
      );
      caseStudy.contentJSON = editorMoves.json;
      caseStudy.contentHTML = editorMoves.html;
    }

    if (req.file) {
      cover = await saveSubmittedCover(req.file, caseStudy.storageKey || caseStudy.slug);
      caseStudy.coverPhoto = cover.url;
    }

    await caseStudy.save();
    databaseSaved = true;

    if (hadContent) {
      await removeUnusedEditorImages(
        original.contentJSON,
        caseStudy.contentJSON,
        caseStudy.storageKey || caseStudy.slug,
      );
    }
    if (original.coverPhoto && original.coverPhoto !== caseStudy.coverPhoto) {
      await removeOldCover(original.coverPhoto).catch((error) =>
        console.error("Failed to remove old case study cover:", error),
      );
    }
    if (session) await removeSession(session).catch(() => {});

    return res.json({
      success: true,
      message: "Case study updated successfully.",
      data: caseStudy,
    });
  } catch (error) {
    if (!databaseSaved) {
      await rollbackEditorMoves(editorMoves);
      if (cover?.destination) await fs.rm(cover.destination, { force: true }).catch(() => {});
      if (caseStudy && original) caseStudy.set(original);
    }
    return next(error);
  }
};
