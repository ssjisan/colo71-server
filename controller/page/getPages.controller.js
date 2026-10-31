const Page = require("../../model/pageModel.js");

const getPages = async (req, res) => {
  try {
    const pages = await Page.find({}).sort({
      order: 1,
    });

    const map = {};
    const roots = [];

    // Create map
    pages.forEach((page) => {
      map[page._id.toString()] = {
        ...page.toObject(),
        children: [],
      };
    });

    // Build tree
    pages.forEach((page) => {
      if (page.parent) {
        const parentId = page.parent.toString();

        if (map[parentId]) {
          map[parentId].children.push(map[page._id.toString()]);
        }
      } else {
        roots.push(map[page._id.toString()]);
      }
    });

    return res.status(200).json(roots);
  } catch (error) {
    console.error("Get pages error:", error);

    return res.status(500).json({
      success: false,
      code: "PAGES_FETCH_FAILED",
      message: "Failed to fetch pages",
    });
  }
};

module.exports = { getPages };
