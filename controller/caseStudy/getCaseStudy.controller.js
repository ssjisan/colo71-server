const CaseStudy = require("../../model/caseStudyModel");

// Public single case study by slug. Drafts are never exposed here.
module.exports = async function getCaseStudy(req, res, next) {
  try {
    const caseStudy = await CaseStudy.findOne({
      slug: req.params.slug,
      published: true,
    }).lean();

    if (!caseStudy) {
      return res.status(404).json({ success: false, message: "Case study not found." });
    }
    return res.json({ success: true, data: caseStudy });
  } catch (error) {
    return next(error);
  }
};
