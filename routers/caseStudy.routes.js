const express = require("express");
const router = express.Router();

const createCaseStudy = require("../controller/caseStudy/createCaseStudy.controller");
const updateCaseStudy = require("../controller/caseStudy/updateCaseStudy.controller");
const deleteCaseStudy = require("../controller/caseStudy/deleteCaseStudy.controller");
const getCaseStudies = require("../controller/caseStudy/getCaseStudies.controller");
const getFeaturedCaseStudies = require("../controller/caseStudy/getFeaturedCaseStudies.controller");
const getCaseStudy = require("../controller/caseStudy/getCaseStudy.controller");
const getCaseStudyById = require("../controller/caseStudy/getCaseStudyById.controller");
const getAllCaseStudiesAdmin = require("../controller/caseStudy/getAllCaseStudiesAdmin.controller");

const {
  createSession,
  uploadEditorImage,
  uploadCoverOnSubmit,
} = require("../middlewares/caseStudyUploadMiddleware");

const {
  removeEditorImage: removeSessionImage,
  discardSession: discardUploadSession,
} = require("../controller/caseStudy/uploadSession.controller");

// Apply your existing auth/permission middleware to admin and write routes.
router.get("/case-studies/featured", getFeaturedCaseStudies);
router.get("/case-studies/slug/:slug", getCaseStudy);
router.get("/case-studies", getCaseStudies);
router.get("/case-studies/admin", getAllCaseStudiesAdmin);
router.get("/case-studies/:id", getCaseStudyById);

router.post("/case-studies/upload-session", createSession);
router.post("/case-studies/upload-session/editor-image", uploadEditorImage);
router.delete("/case-studies/upload-session/editor-image/:filename", removeSessionImage);
router.delete("/case-studies/upload-session", discardUploadSession);

router.post("/case-studies", uploadCoverOnSubmit, createCaseStudy);
router.put("/case-studies/:id", uploadCoverOnSubmit, updateCaseStudy);
router.delete("/case-studies/:id", deleteCaseStudy);

module.exports = router;
