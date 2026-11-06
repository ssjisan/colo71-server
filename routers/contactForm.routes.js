const express = require("express");
const router = express.Router();

const getContactFormConfig = require("../controller/contact/getContactFormConfig.controller");
const updateContactFormConfig = require("../controller/contact/updateContactFormConfig.controller");
const { requiredSignIn } = require("../middlewares/authMiddleware");
const contactEnquiryRateLimit = require("../middlewares/contactEnquiryRateLimit");
const createContactEnquiry = require("../controller/contact/createContactEnquiry.controller");
const getPublicEnquiryTypes = require("../controller/contact/getPublicEnquiryTypes.controller");
const getContactEnquiries = require("../controller/contact/getContactEnquiries.controller");
const viewContactEnquiry = require("../controller/contact/viewContactEnquiry.controller");
const archiveContactEnquiry = require("../controller/contact/archiveContactEnquiry.controller");

// Add your existing admin authentication middleware.

router.get("/get-contact-config", requiredSignIn, getContactFormConfig);
router.put("/update-contact-config", requiredSignIn, updateContactFormConfig);
router.post("/submit-enquiry", contactEnquiryRateLimit, createContactEnquiry);
router.get("/public-enquiry-types", getPublicEnquiryTypes);
router.get("/get-contact-enquiries", requiredSignIn, getContactEnquiries);
router.patch(
  "/view-contact-enquiry/:id",
  requiredSignIn,
  viewContactEnquiry
);

router.patch(
  "/archive-contact-enquiry/:id",
  requiredSignIn,
  archiveContactEnquiry
);
module.exports = router;
