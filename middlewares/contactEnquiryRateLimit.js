
const rateLimit = require("express-rate-limit");

const contactEnquiryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many submissions. Please try again later.",
  },
});

module.exports = contactEnquiryRateLimit;
