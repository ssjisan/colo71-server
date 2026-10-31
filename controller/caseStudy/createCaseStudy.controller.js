const fs = require("fs/promises");
const path = require("path");
const CaseStudy = require("../../model/caseStudyModel");
const {
  parseContentJSON,
  uniqueSlug,
  getSession,
  finalizeEditorImages,
  saveSubmittedCover,
  rollbackEditorMoves,
  removeSession,
} = require("../../utils/caseStudyFiles");
const { serializeContent } = require("../../utils/caseStudyHtml");

const httpError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

function asBoolean(value, fallback = false) {
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

module.exports = async function createCaseStudy(req, res, next) {
  let caseStudy;
  let session;
  let editorMoves;
  let cover;
  let databaseSaved = false;

  try {
    const title = String(req.body.title || "").trim();
    const summary = optionalText(req.body.summary, "Summary", 500);
    const clientName = optionalText(req.body.clientName, "Client name", 200);
    const industry = optionalText(req.body.industry, "Industry", 100);
    const projectLocation = optionalText(req.body.projectLocation, "Project location", 200);
    const projectType = optionalText(req.body.projectType, "Project type", 120);

    if (!title || title.length > 200) throw httpError("Title must contain 1 to 200 characters.");
    if (!industry) throw httpError("Industry is required.");
    if (!projectType) throw httpError("Project type is required.");

    let completionDate = null;
    if (req.body.completionDate) {
      completionDate = new Date(req.body.completionDate);
      if (Number.isNaN(completionDate.getTime())) throw httpError("Completion date is invalid.");
    }

    const contentJSON = parseContentJSON(req.body.contentJSON);
    session = await getSession(req);
    const published = asBoolean(req.body.published);
    const featured = asBoolean(req.body.featured);
    const slug = await uniqueSlug(title);

    caseStudy = new CaseStudy({
      title,
      slug,
      storageKey: slug,
      summary,
      clientName,
      industry,
      projectLocation,
      completionDate,
      projectType,
      contentJSON,
      contentHTML: serializeContent(contentJSON),
      coverPhoto: null,
      featured,
      published,
      publishedAt: published ? new Date() : null,
    });

    editorMoves = await finalizeEditorImages(caseStudy.contentJSON, session, caseStudy.storageKey);
    cover = await saveSubmittedCover(req.file, caseStudy.storageKey);
    caseStudy.contentJSON = editorMoves.json;
    caseStudy.contentHTML = editorMoves.html;
    caseStudy.coverPhoto = cover?.url || null;

    await caseStudy.save();
    databaseSaved = true;
    await removeSession(session).catch((error) =>
      console.error("Failed to remove case study upload session:", error),
    );

    return res.status(201).json({
      success: true,
      message: "Case study created successfully.",
      data: caseStudy,
    });
  } catch (error) {
    if (!databaseSaved) {
      await rollbackEditorMoves(editorMoves);
      if (cover?.destination) await fs.rm(cover.destination, { force: true }).catch(() => {});
      if (caseStudy?.storageKey) {
        const directory = path.join(
          require("../../middlewares/caseStudyUploadMiddleware").CASE_STUDY_ROOT,
          caseStudy.storageKey,
        );
        await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
      }
      if (caseStudy?._id) await CaseStudy.deleteOne({ _id: caseStudy._id }).catch(() => {});
    }
    return next(error);
  }
};
