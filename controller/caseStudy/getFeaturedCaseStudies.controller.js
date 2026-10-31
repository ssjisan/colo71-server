const CaseStudy = require("../../model/caseStudyModel");

module.exports = async function getFeaturedCaseStudies(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const caseStudies = await CaseStudy.find({ published: true, featured: true })
      .select("-contentJSON -contentHTML")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, data: caseStudies });
  } catch (error) {
    return next(error);
  }
};
