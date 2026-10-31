const mongoose = require("mongoose");
const Page = require("../../model/pageModel.js");

const deletePage = async (req, res) => {
  try {
    const { id } = req.params;

    // -----------------------------
    // Validate ID
    // -----------------------------
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PAGE_ID",
        message: "Invalid page ID",
      });
    }

    // -----------------------------
    // Find page
    // -----------------------------
    const page = await Page.findById(id);

    if (!page) {
      return res.status(404).json({
        success: false,
        code: "PAGE_NOT_FOUND",
        message: "Page not found",
      });
    }

    // -----------------------------
    // Check children
    // -----------------------------
    const hasChildren = await Page.exists({
      parent: id,
    });

    if (hasChildren) {
      return res.status(400).json({
        success: false,
        code: "PAGE_HAS_CHILDREN",
        message: "Cannot delete page with child pages",
      });
    }

    // -----------------------------
    // Delete
    // -----------------------------
    await Page.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      code: "PAGE_DELETED",
      message: "Page deleted successfully",
    });
  } catch (error) {
    console.error("Delete page error:", error);

    return res.status(500).json({
      success: false,
      code: "PAGE_DELETE_FAILED",
      message: "Failed to delete page",
    });
  }
};

module.exports = { deletePage };
