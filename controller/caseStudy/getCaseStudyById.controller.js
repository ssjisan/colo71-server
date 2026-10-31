const mongoose = require("mongoose");
const CaseStudy = require("../../model/caseStudyModel");

// Admin/editor endpoint: returns a case study by MongoDB ID, including drafts.
module.exports = async function getCaseStudyById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid case study ID." });
    }

    const caseStudy = await CaseStudy.findById(id).lean();
    if (!caseStudy) {
      return res.status(404).json({ success: false, message: "Case study not found." });
    }
    return res.json({ success: true, data: caseStudy });
  } catch (error) {
    return next(error);
  }
};
