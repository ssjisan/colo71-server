const mongoose = require("mongoose");
const Page = require("../../model/pageModel.js");

const getPage = async (req, res) => {
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

    const page = await Page.findById(id);

    if (!page) {
      return res.status(404).json({
        success: false,
        code: "PAGE_NOT_FOUND",
        message: "Page not found",
      });
    }

    return res.status(200).json({
      success: true,
      code: "PAGE_FETCHED",
      message: "Page fetched successfully",
      data: page,
    });
  } catch (error) {
    console.error("Get page error:", error);

    return res.status(500).json({
      success: false,
      code: "PAGE_FETCH_FAILED",
      message: "Failed to fetch page",
    });
  }
};

module.exports = { getPage };
