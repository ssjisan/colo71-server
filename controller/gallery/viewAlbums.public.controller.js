const GalleryAlbum = require("../../model/galleryModel");

const viewAlbumsPublic = async (req, res, next) => {
  try {
    const albums = await GalleryAlbum.find({
      status: "published",
    })
      .select("name slug thumbnail images order createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: albums.length,
      data: albums,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = viewAlbumsPublic;
