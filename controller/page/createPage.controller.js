const Page = require("../../model/pageModel.js");
const { generateSlug } = require("../../helper/generateSlug.js");

const createPage = async (req, res) => {
  try {
    const { name, path, icon, order, parent, isMenu, isActive, description } =
      req.body;

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
    // Check duplicate slug
    // -----------------------------
    const existingPage = await Page.findOne({ slug });

    if (existingPage) {
      return res.status(409).json({
        success: false,
        code: "PAGE_SLUG_ALREADY_EXISTS",
        message: "Slug already exists. Try a different name.",
      });
    }

    // -----------------------------
    // Create page
    // -----------------------------
    const page = new Page({
      name: trimmedName,
      slug,
      path: trimmedPath,
      icon,
      order,
      parent: parent || null,
      isMenu,
      isActive,
      description,
    });

    await page.save();

    return res.status(201).json({
      success: true,
      code: "PAGE_CREATED",
      message: "Page created successfully",
      data: page,
    });
  } catch (error) {
    console.error("Create page error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "PAGE_SLUG_ALREADY_EXISTS",
        message: "Slug already exists. Try a different name.",
      });
    }

    return res.status(500).json({
      success: false,
      code: "PAGE_CREATE_FAILED",
      message: "Failed to create page",
    });
  }
};

module.exports = { createPage };
