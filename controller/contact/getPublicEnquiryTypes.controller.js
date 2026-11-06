const ContactFormConfig = require("../../model/ContactFormConfigModel");

const getPublicEnquiryTypes = async (req, res) => {
  try {
    const config = await ContactFormConfig.findOne().lean();

    if (!config) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const enquiryTypes = (config.enquiryType || [])
      .filter((item) => item.isActive)
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        id: item.id,
        name: item.name,
      }));

    return res.status(200).json({
      success: true,
      data: enquiryTypes,
    });
  } catch (error) {
    console.error("Get public enquiry types error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load enquiry types.",
    });
  }
};

module.exports = getPublicEnquiryTypes;