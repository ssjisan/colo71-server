const CaseStudy = require("../../model/caseStudyModel");
const { removeCaseStudyFiles } = require("../../utils/caseStudyFiles");

module.exports = async function deleteCaseStudy(req, res, next) {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) return res.status(404).json({ success: false, message: "Case study not found." });
    await caseStudy.deleteOne();
    await removeCaseStudyFiles(caseStudy);
    return res.json({ success: true, message: "Case study deleted successfully." });
  } catch (error) {
    return next(error);
  }
};
