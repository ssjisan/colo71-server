const fs = require("fs/promises");
const path = require("path");
const GalleryAlbum = require("../../model/galleryModel");

const STORAGE_ROOT =
  process.env.STORAGE_PATH || path.resolve(__dirname, "../../../file-storage");

const GALLERY_ROOT = path.join(STORAGE_ROOT, "gallery");

const deleteAlbum = async (req, res, next) => {
  try {
    const { id } = req.params;

    const album = await GalleryAlbum.findById(id);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: "Album not found.",
      });
    }

    if (album.slug) {
      const albumDirectory = path.resolve(GALLERY_ROOT, album.slug);
      const galleryRoot = path.resolve(GALLERY_ROOT);

      if (albumDirectory.startsWith(`${galleryRoot}${path.sep}`)) {
        await fs.rm(albumDirectory, {
          recursive: true,
          force: true,
        });
      }
    }

    await GalleryAlbum.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Album deleted successfully.",
      data: { id: album._id },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = deleteAlbum;
