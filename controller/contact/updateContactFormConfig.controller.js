
const ContactFormConfig = require("../../model/ContactFormConfigModel");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const updateContactFormConfig = async (req, res) => {
  try {
    const { enquiryType, mailGroup } = req.body;

    if (!Array.isArray(enquiryType) || !Array.isArray(mailGroup)) {
      return res.status(400).json({
        success: false,
        message: "Enquiry types and mail group must be arrays.",
      });
    }

    // Normalize enquiry types
    const normalizedEnquiryTypes = enquiryType.map((item) => {
      if (
        !item ||
        typeof item.id !== "string" ||
        typeof item.name !== "string"
      ) {
        return null;
      }

      return {
        id: item.id.trim().toLowerCase(),
        name: item.name.trim(),
        order: Number(item.order) || 0,
        isActive: item.isActive !== false,
      };
    });

    if (normalizedEnquiryTypes.some((item) => !item)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry type data.",
      });
    }

    // Validate enquiry types
    if (
      normalizedEnquiryTypes.some(
        (item) =>
          !item.id ||
          !item.name ||
          item.name.length > 100 ||
          !Number.isFinite(item.order) ||
          item.order < 0
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid enquiry type details.",
      });
    }

    // Prevent duplicate enquiry type IDs
    const enquiryIds = normalizedEnquiryTypes.map((item) => item.id);

    if (new Set(enquiryIds).size !== enquiryIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate enquiry type IDs are not allowed.",
      });
    }

    // Normalize recipient emails
    const normalizedMailGroup = mailGroup.map((email) =>
      typeof email === "string" ? email.trim().toLowerCase() : null
    );

    // Validate recipient emails
    if (
      normalizedMailGroup.some(
        (email) => !email || !EMAIL_REGEX.test(email)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid recipient email addresses.",
      });
    }

    // Prevent duplicate emails
    if (
      new Set(normalizedMailGroup).size !==
      normalizedMailGroup.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Duplicate email addresses are not allowed.",
      });
    }

    // Update existing config or create the first one
    let config = await ContactFormConfig.findOne();

    if (config) {
      config.enquiryType = normalizedEnquiryTypes;
      config.mailGroup = normalizedMailGroup;
    } else {
      config = new ContactFormConfig({
        enquiryType: normalizedEnquiryTypes,
        mailGroup: normalizedMailGroup,
      });
    }

    await config.save();

    return res.status(200).json({
      success: true,
      message: "Contact form configuration updated successfully.",
      data: {
        enquiryType: config.enquiryType,
        mailGroup: config.mailGroup,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update contact form config error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update contact form configuration.",
    });
  }
};

module.exports = updateContactFormConfig;
