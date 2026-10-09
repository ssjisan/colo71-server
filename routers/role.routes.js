const express = require("express");
const router = express.Router();

const { createRole } = require("../controller/role/createRole.controller.js");
const { getRoles } = require("../controller/role/getRoles.controller.js");
const { getRole } = require("../controller/role/getRole.controller.js");
const { deleteRole } = require("../controller/role/deleteRole.controller.js");
const { requiredSignIn } = require("../middlewares/authMiddleware.js");
const { checkPermission } = require("../middlewares/checkPermission.js");
const { updateRole } = require("../controller/role/updateRole.controller.js");

router.post(
  "/role-settings",
  requiredSignIn,
  checkPermission("roles", "canCreate"),
  createRole,
); // Create Role End point api

router.put(
  "/roles/:id",
  requiredSignIn,
  checkPermission("roles", "canUpdate"),
  updateRole,
); // Update ROle End point api

router.get(
  "/roles",
  requiredSignIn,
  checkPermission("roles", "canView"),
  getRoles,
); // Get roles end point api

router.get(
  "/role/:id",
  requiredSignIn,
  checkPermission("roles", "canView"),
  getRole,
); // get single role end point api

router.delete(
  "/role/:id",
  requiredSignIn,
  checkPermission("roles", "canDelete"),
  deleteRole,
); // Delete specific role end point api

module.exports = router;
