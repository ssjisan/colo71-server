const express = require("express");

const { loginUser } = require("../controller/auth/login.controller.js");
const { getMe } = require("../controller/auth/me.controller.js");
const {
  changePassword,
} = require("../controller/auth/changePassword.controller.js");
const {
  refreshAccessToken,
} = require("../controller/auth/refresh.controller.js");
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

const router = express.Router();

router.post("/login", loginUser);
router.get("/me", requiredSignIn, getMe); // Protected route to get current user information
router.post("/refresh", refreshAccessToken); // Route to refresh access token using refresh token
router.post("/change-password", changePassword); // Route to change password using password-change token
router.get(
  "/users",
  requiredSignIn,
  checkPermission("users", "canView"),
  getUsers,
); // Protected route to get all users with permission check

router.delete(
  "/users/:id",
  requiredSignIn,
  checkPermission("users", "canDelete"),
  deleteUser,
); // Protected route to delete a user with permission check
router.post("/forgot-password", forgotPassword); // Forgot password mail opt

router.post("/verify-forgot-password-otp", verifyForgotPasswordOtp); // verify otp from mail
router.post("/resend-forgot-password-otp", resendForgotPasswordOtp); // resend otp
router.post("/reset-forgot-password", resetPassword); // reset password after opt verify

router.post("/forgot-password-status", getPasswordResetStatus);
module.exports = router;
