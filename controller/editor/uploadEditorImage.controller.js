const path = require("path");
const { STORAGE_ROOT } = require("../../middlewares/editorUploadMiddleware");

const uploadEditorImage = (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "An image file is required.",
      });
    }

    const relativePath = path
      .relative(STORAGE_ROOT, req.file.path)
      .split(path.sep)
      .join("/");

    return res.status(201).json({
      success: true,
      message: "Editor image uploaded successfully.",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/file-storage/${relativePath}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = uploadEditorImage;
