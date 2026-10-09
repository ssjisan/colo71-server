const express = require("express");
const router = express.Router();

// Controllers
const { createPage } = require("../controller/page/createPage.controller.js");

const { updatePage } = require("../controller/page/updatePage.controller.js");

const { getPages } = require("../controller/page/getPages.controller.js");

const { getPage } = require("../controller/page/getPage.controller.js");

const { deletePage } = require("../controller/page/deletePage.controller.js");

// Middlewares
const { requiredSignIn } = require("../middlewares/authMiddleware.js");
const { checkPermission } = require("../middlewares/checkPermission.js");

// ===============================
// CREATE PAGE
// ===============================
router.post(
  "/pages",
  requiredSignIn,
  checkPermission("pages", "canCreate"),
  createPage,
);

// ===============================
// GET ALL PAGES
// ===============================
router.get(
  "/pages",
  requiredSignIn,
  checkPermission("pages", "canView"),
  getPages,
);

// ===============================
// GET SINGLE PAGE
// ===============================
router.get(
  "/pages/:id",
  requiredSignIn,
  checkPermission("pages", "canView"),
  getPage,
);

// ===============================
// UPDATE PAGE
// ===============================
router.put(
  "/pages/:id",
  requiredSignIn,
  checkPermission("pages", "canUpdate"),
  updatePage,
);

// ===============================
// DELETE PAGE
// ===============================
router.delete(
  "/pages/:id",
  requiredSignIn,
  checkPermission("pages", "canDelete"),
  deletePage,
);

module.exports = router;
