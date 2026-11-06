
const mongoose = require("mongoose");
const ContactEnquiry = require("../../model/ContactEnquiryModel");

const viewContactEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID.",
      });
    }

    const enquiry = await ContactEnquiry.findOneAndUpdate(
      {
        _id: id,
        isArchived: false,
      },
      {
        $set: { status: "viewed" },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found or already archived.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry marked as viewed.",
      data: enquiry,
    });
  } catch (error) {
    console.error("View contact enquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update enquiry status.",
    });
  }
};

module.exports = viewContactEnquiry;
