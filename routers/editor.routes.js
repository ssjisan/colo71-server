const express = require("express");
const router = express.Router();

const uploadEditorImage = require("../controller/editor/uploadEditorImage.controller");
const {
  uploadEditorImage: editorImageMiddleware,
} = require("../middlewares/editorUploadMiddleware");

router.post("/editor-image", editorImageMiddleware, uploadEditorImage);

module.exports = router;
