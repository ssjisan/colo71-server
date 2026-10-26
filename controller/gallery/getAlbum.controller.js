const mongoose = require("mongoose");
const GalleryAlbum = require("../../model/galleryModel");

const getAlbumById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid album ID.",
      });
    }

    const album = await GalleryAlbum.findById(id).lean();

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: album,
    });
  } catch (error) {
    console.error("Get album by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch album.",
    });
  }
};

module.exports = {
  // Keep your existing exports.
  getAlbumById,
};
