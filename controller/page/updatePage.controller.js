const mongoose = require("mongoose");
const Page = require("../../model/pageModel.js");
const { generateSlug } = require("../../helper/generateSlug.js");

const updatePage = async (req, res) => {
  try {
    const { id } = req.params;

    const { name, path, icon, order, parent, isMenu, isActive, description } =
      req.body;

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
    // Validation
    // -----------------------------
    if (!name || !name.trim() || !path || !path.trim()) {
      return res.status(400).json({
        success: false,
        code: "PAGE_NAME_PATH_REQUIRED",
        message: "Name and path are required",
      });
    }

    const trimmedName = name.trim();
    const trimmedPath = path.trim();

    const slug = generateSlug(trimmedName);

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
    // Check duplicate slug
    // -----------------------------
    const existingPage = await Page.findOne({
      slug,
      _id: { $ne: id },
    });

    if (existingPage) {
      return res.status(409).json({
        success: false,
        code: "PAGE_SLUG_ALREADY_EXISTS",
        message: "Slug already exists. Try a different name.",
      });
    }

    // -----------------------------
    // Update page
    // -----------------------------
    page.name = trimmedName;
    page.slug = slug;
    page.path = trimmedPath;
    page.icon = icon;
    page.order = order;
    page.parent = parent || null;
    page.isMenu = isMenu;
    page.isActive = isActive;
    page.description = description;

    await page.save();

    return res.status(200).json({
      success: true,
      code: "PAGE_UPDATED",
      message: "Page updated successfully",
      data: page,
    });
  } catch (error) {
    console.error("Update page error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "PAGE_SLUG_ALREADY_EXISTS",
        message: "Slug already exists. Try a different name.",
      });
    }

    return res.status(500).json({
      success: false,
      code: "PAGE_UPDATE_FAILED",
      message: "Failed to update page",
    });
  }
};

module.exports = { updatePage };
