const mongoose = require("mongoose");

const ContactEnquiry = require("../../model/ContactEnquiryModel");
const ContactFormConfig = require("../../model/ContactFormConfigModel");

const verifyTurnstile = require("../../utils/verifyTurnstile");
const sendContactEmail = require("../../helper/sendContactEmail");

const {
  visitorAcknowledgementTemplate,
  adminEnquiryNotificationTemplate,
} = require("../../helper/emailTemplates/contactEnquiryEmailTemplates");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createContactEnquiry = async (req, res) => {
  try {
    const {
      name,
      email,
      company = "",
      phone = "",
      enquiryType,
      message,
      turnstileToken,
      website,
    } = req.body || {};

    // 1. Honeypot check
    // Keep this field hidden on the frontend.
    if (typeof website === "string" && website.trim()) {
      return res.status(400).json({
        success: false,
        message: "Unable to process your submission.",
      });
    }

    // 2. Validate required fields
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof enquiryType !== "string" ||
      typeof message !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = typeof company === "string" ? company.trim() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const cleanEnquiryType = enquiryType.trim();
    const cleanMessage = message.trim();

    if (!cleanName || !cleanEmail || !cleanEnquiryType || !cleanMessage) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields.",
      });
    }

    // 3. Validate field lengths
    if (
      cleanName.length > 100 ||
      cleanEmail.length > 254 ||
      cleanCompany.length > 150 ||
      cleanPhone.length > 30 ||
      cleanEnquiryType.length > 100 ||
      cleanMessage.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more fields exceed the allowed length.",
      });
    }

    // 4. Validate email
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // 5. Verify Cloudflare Turnstile
    if (!turnstileToken) {
      return res.status(400).json({
        success: false,
        message: "Please complete the CAPTCHA verification.",
      });
    }

    const captchaValid = await verifyTurnstile(turnstileToken);

    if (!captchaValid) {
      return res.status(400).json({
        success: false,
        message: "CAPTCHA verification failed. Please try again.",
      });
    }

    // 6. Validate enquiry type against admin configuration
    const config = await ContactFormConfig.findOne().lean();

    if (!config) {
      return res.status(503).json({
        success: false,
        message: "Contact form is temporarily unavailable.",
      });
    }

    const selectedType = (config.enquiryType || []).find(
      (item) => item.id === cleanEnquiryType && item.isActive === true,
    );

    if (!selectedType) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid enquiry type.",
      });
    }

    // 7. Save enquiry first
    const enquiry = await ContactEnquiry.create({
      name: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      phone: cleanPhone,

      enquiryType: {
        id: selectedType.id,
        name: selectedType.name,
      },

      message: cleanMessage,

      source: {
        page:
          typeof req.body.sourcePage === "string" &&
          req.body.sourcePage.length <= 200
            ? req.body.sourcePage
            : "/contact",
      },
    });

    // 8. Prepare emails
    const visitorEmail = visitorAcknowledgementTemplate(enquiry);

    const adminEmail = adminEnquiryNotificationTemplate(enquiry);

    const mailGroup = [
      ...new Set(
        (config.mailGroup || [])
          .filter(
            (address) =>
              typeof address === "string" && EMAIL_REGEX.test(address.trim()),
          )
          .map((address) => address.trim().toLowerCase()),
      ),
    ];

    // 9. Send emails independently
    const emailTasks = [
      sendContactEmail({
        to: cleanEmail,
        replyTo: process.env.CONTACT_REPLY_TO || undefined,
        ...visitorEmail,
      }),
    ];

    if (mailGroup.length) {
      emailTasks.push(
        sendContactEmail({
          to: mailGroup,
          replyTo: cleanEmail,
          ...adminEmail,
        }),
      );
    }

    const emailResults = await Promise.allSettled(emailTasks);

    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          index === 0
            ? "Contact enquiry visitor acknowledgement failed:"
            : "Contact enquiry internal notification failed:",
          result.reason?.response?.data || result.reason?.message,
        );
      }
    });

    // 10. Return success because enquiry is already saved
    return res.status(201).json({
      success: true,
      message: "Your enquiry has been submitted successfully.",
      referenceId: enquiry.referenceId,
    });
  } catch (error) {
    console.error("Create contact enquiry failed:", error);

    // Turnstile service unavailable
    if (error.message === "CAPTCHA verification service is unavailable.") {
      return res.status(503).json({
        success: false,
        message:
          "CAPTCHA service is temporarily unavailable. Please try again.",
      });
    }

    if (error.message === "Turnstile secret key is not configured.") {
      return res.status(500).json({
        success: false,
        message: "Contact form configuration error.",
      });
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Please check the submitted information.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit your enquiry. Please try again.",
    });
  }
};

module.exports = createContactEnquiry;
