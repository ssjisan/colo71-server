const CaseStudy = require("../../model/caseStudyModel");

// Admin list: includes drafts and published case studies.
module.exports = async function getAllCaseStudiesAdmin(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};

    if (req.query.published === "true") filter.published = true;
    if (req.query.published === "false") filter.published = false;
    if (req.query.featured === "true") filter.featured = true;
    if (req.query.featured === "false") filter.featured = false;

    const [caseStudies, total] = await Promise.all([
      CaseStudy.find(filter)
        .select("-contentJSON -contentHTML")
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CaseStudy.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: caseStudies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
};
