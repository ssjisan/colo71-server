const express = require("express");
const router = express.Router();

const createAlbum = require("../controller/gallery/createAlbum.controller");

const uploadAlbumFiles = require("../controller/gallery/uploadAlbumFiles.controller");

const viewAlbumsAdmin = require("../controller/gallery/viewAlbums.admin.controller");

const viewAlbumsPublic = require("../controller/gallery/viewAlbums.public.controller");

const viewAlbum = require("../controller/gallery/viewAlbum.controller");

const { createImageUpload } = require("../middlewares/uploadMiddleware");
const { requiredSignIn } = require("../middlewares/authMiddleware");
const removeAlbumImage = require("../controller/gallery/removeAlbumImage.controller");
const updateAlbum = require("../controller/gallery/updateAlbum.controller");
const { getAlbumById } = require("../controller/gallery/getAlbum.controller");
const deleteAlbum = require("../controller/gallery/deleteAlbum.controller");

const galleryUpload = createImageUpload({
  fields: [
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 50 },
  ],
  maxFiles: 51,
  maxImages: 50,
});

// Add your own authentication and authorization middleware.

// Upload files into a temporary session.
router.post("/upload", ...galleryUpload, requiredSignIn, uploadAlbumFiles);

// Submit the album and move files into permanent storage.
router.post("/create-album", requiredSignIn, createAlbum);

// Admin: view all albums, including drafts.
router.get("/admin", requiredSignIn, viewAlbumsAdmin);

// Public website: view published albums only.
router.get("/public", viewAlbumsPublic);

// View one published album by slug.
router.get("/gallery/:slug", viewAlbum);
router.delete("/remove-image", requiredSignIn, removeAlbumImage);
router.put("/edit-album/:id", requiredSignIn, updateAlbum);
router.get("/get-album/:id", requiredSignIn, getAlbumById);

// Delete album
router.delete("/delete-album/:id", requiredSignIn, deleteAlbum);
module.exports = router;
