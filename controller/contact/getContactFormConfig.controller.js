const ContactFormConfig = require("../../model/ContactFormConfigModel");

const getContactFormConfig = async (req, res) => {
  try {
    let config = await ContactFormConfig.findOne().lean();

    if (!config) {
      config = {
        enquiryType: [],
        mailGroup: [],
      };
    }

    return res.status(200).json({
      success: true,
      message: "Contact form configuration fetched successfully.",
      data: config,
    });
  } catch (error) {
    console.error("Get contact form config error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact form configuration.",
    });
  }
};

module.exports = getContactFormConfig;
