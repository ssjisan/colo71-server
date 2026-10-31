const GalleryAlbum = require("../../model/galleryModel");

const viewAlbum = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const filter = { slug };

    // Public requests should only return published albums.
    if (req.galleryAccess !== "admin") {
      filter.status = "published";
    }

    const album = await GalleryAlbum.findOne(filter).lean();

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
    next(error);
  }
};

module.exports = viewAlbum;
