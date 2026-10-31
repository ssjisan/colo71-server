const express = require("express");
const router = express.Router();
const createBlog = require("../controller/blog/createBlog.controller");
const updateBlog = require("../controller/blog/updateBlog.controller");
const deleteBlog = require("../controller/blog/deleteBlog.controller");
const getBlogs = require("../controller/blog/getBlogs.controller");
const getFeaturedBlogs = require("../controller/blog/getFeaturedBlogs.controller");
const getBlog = require("../controller/blog/getBlog.controller");
const getBlogById = require("../controller/blog/getBlogById.controller");
const getAllBlogsAdmin = require("../controller/blog/getAllBlogsAdmin.controller");
const {
  createSession,
  uploadEditorImage,
  uploadCoverOnSubmit,
  removeEditorImage,
  discardSession,
} = require("../middlewares/blogUploadMiddleware");
const {
  removeEditorImage: removeSessionImage,
  discardSession: discardUploadSession,
} = require("../controller/blog/uploadSession.controller");

// No auth middleware is included. Apply your own auth middleware to the admin/write routes in your app.
router.get("/blogs/featured", getFeaturedBlogs);
router.get("/blogs/slug/:slug", getBlog);
router.get("/blogs", getBlogs);
router.get("/blogs/admin", getAllBlogsAdmin);
router.get("/blogs/:id", getBlogById);
router.post("/blogs/upload-session", createSession);
router.post("/blogs/upload-session/editor-image", uploadEditorImage);
router.delete(
  "/blogs/upload-session/editor-image/:filename",
  removeSessionImage,
);
router.delete("/blogs/upload-session", discardUploadSession);
router.post("/blogs", uploadCoverOnSubmit, createBlog);
router.put("/blogs/:id", uploadCoverOnSubmit, updateBlog);
router.delete("/blogs/:id", deleteBlog);
module.exports = router;
