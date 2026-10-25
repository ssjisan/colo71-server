const express = require("express");

const { loginUser } = require("../controller/auth/login.controller.js");
const { getMe } = require("../controller/auth/me.controller.js");
const {
  changePassword,
} = require("../controller/auth/changePassword.controller.js");
const {
  refreshAccessToken,
} = require("../controller/auth/refresh.controller.js");
const { logout } = require("../controller/auth/logout.controller.js");

const { requiredSignIn } = require("../middlewares/authMiddleware.js");
const { checkPermission } = require("../middlewares/checkPermission.js");

const { getUsers } = require("../controller/user/getUsers.controller.js");
const { deleteUser } = require("../controller/user/deleteUser.controller.js");

const {
  forgotPassword,
} = require("../controller/auth/forgotPassword.controller.js");
const {
  verifyForgotPasswordOtp,
} = require("../controller/auth/verifyForgotPasswordOtp.controller.js");
const {
  resetPassword,
} = require("../controller/auth/resetPassword.controller.js");
const {
  resendForgotPasswordOtp,
} = require("../controller/auth/resendForgotPasswordOtp.controller.js");
const {
  getPasswordResetStatus,
} = require("../controller/auth/getPasswordResetStatus.controller.js");

const {
  changeOwnPassword,
} = require("../controller/auth/changeOwnPassword.controller.js");

const router = express.Router();

router.post("/login", loginUser);
router.post("/logout", logout);
router.get("/me", requiredSignIn, getMe);
router.post("/refresh", refreshAccessToken);
router.post("/change-password", changePassword);
router.post("/change-own-password", requiredSignIn, changeOwnPassword);
router.get(
  "/users",
  requiredSignIn,
  checkPermission("users", "canView"),
  getUsers,
);

router.delete(
  "/users/:id",
  requiredSignIn,
  checkPermission("users", "canDelete"),
  deleteUser,
);

router.post("/forgot-password", forgotPassword);
router.post("/verify-forgot-password-otp", verifyForgotPasswordOtp);
router.post("/resend-forgot-password-otp", resendForgotPasswordOtp);
router.post("/reset-forgot-password", resetPassword);
router.post("/forgot-password-status", getPasswordResetStatus);

module.exports = router;
