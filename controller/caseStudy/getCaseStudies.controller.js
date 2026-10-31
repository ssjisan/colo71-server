const CaseStudy = require("../../model/caseStudyModel");

// Public list: published case studies only.
module.exports = async function getCaseStudies(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const filter = { published: true };
    if (req.query.featured === "true") filter.featured = true;

    const [caseStudies, total] = await Promise.all([
      CaseStudy.find(filter)
        .select("-contentJSON -contentHTML")
        .sort({ publishedAt: -1, createdAt: -1 })
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
