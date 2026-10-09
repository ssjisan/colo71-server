const express = require("express");

const { createUser } = require("../controller/user/createUser.controller.js");

const { getUsers } = require("../controller/user/getUsers.controller.js");
const { getUser } = require("../controller/user/getUser.controller.js");
const { updateUser } = require("../controller/user/updateUser.controller.js");

const { requiredSignIn } = require("../middlewares/authMiddleware.js");
const { checkPermission } = require("../middlewares/checkPermission.js");

const router = express.Router();

// Create User
router.post(
  "/create-user",
  requiredSignIn,
  checkPermission("users", "canCreate"),
  createUser,
);

// Get All Users
router.get(
  "/users",
  requiredSignIn,
  checkPermission("users", "canView"),
  getUsers,
);

router.get(
  "/users/:id",
  requiredSignIn,
  checkPermission("users", "canView"),
  getUser,
);

router.put(
  "/users/:id",
  requiredSignIn,
  checkPermission("users", "canUpdate"),
  updateUser,
);
module.exports = router;
