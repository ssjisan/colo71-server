
const mongoose = require("mongoose");
const ContactEnquiry = require("../../model/ContactEnquiryModel");

const archiveContactEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID.",
      });
    }

    if (typeof comment !== "string" || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: "An archive comment is required.",
      });
    }

    if (comment.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Archive comment cannot exceed 1000 characters.",
      });
    }

    const enquiry = await ContactEnquiry.findOneAndUpdate(
      {
        _id: id,
        isArchived: false,
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          archiveComment: comment.trim(),
        },
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
      message: "Enquiry archived successfully.",
      data: enquiry,
    });
  } catch (error) {
    console.error("Archive contact enquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to archive enquiry.",
    });
  }
};

module.exports = archiveContactEnquiry;
