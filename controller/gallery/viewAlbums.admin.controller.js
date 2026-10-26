const GalleryAlbum = require("../../model/galleryModel");

const viewAlbumsAdmin = async (req, res, next) => {
  try {
    const albums = await GalleryAlbum.find().sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: albums.length,
      data: albums,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = viewAlbumsAdmin;
