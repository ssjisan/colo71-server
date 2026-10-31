const jwt = require("jsonwebtoken");
const { getCookieOptions } = require("../../helper/getCookieOptions.js");
const UserModel = require("../../model/userModel.js");
const AuthSessionModel = require("../../model/authSessionModel.js");

const {
  hashPassword,
  comparePassword,
} = require("../../helper/passwordHash.js");

const clearPasswordChangeCookie = (req, res) => {
  res.clearCookie("passwordChangeToken", getCookieOptions(req));
};

const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body || {};

    // 1. Validate request
    if (
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        code: "PASSWORD_REQUIRED",
        message: "New password and confirm password are required",
      });
    }

    // 2. Check password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: "PASSWORD_MISMATCH",
        message: "Passwords do not match",
      });
    }

    // 3. Validate password strength
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        code: "WEAK_PASSWORD",
        message:
          "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    // 4. Check JWT configuration
    if (!process.env.JWT_SECURE) {
      console.error("JWT_SECURE is missing.");

      return res.status(500).json({
        success: false,
        code: "AUTH_CONFIG_ERROR",
        message: "Authentication is not configured correctly",
      });
    }

    // 5. Get password-change token
    const passwordChangeToken = req.cookies?.passwordChangeToken;

    if (!passwordChangeToken) {
      return res.status(401).json({
        success: false,
        code: "PASSWORD_CHANGE_SESSION_EXPIRED",
        message: "Password change session has expired. Please login again.",
      });
    }

    // 6. Verify token
    let decoded;

    try {
      decoded = jwt.verify(passwordChangeToken, process.env.JWT_SECURE);
    } catch {
      clearPasswordChangeCookie(req, res);

      return res.status(401).json({
        success: false,
        code: "PASSWORD_CHANGE_SESSION_EXPIRED",
        message: "Password change session has expired. Please login again.",
      });
    }

    // 7. Validate token purpose and user ID
    if (
      !decoded?._id ||
      typeof decoded._id !== "string" ||
      decoded.purpose !== "PASSWORD_CHANGE"
    ) {
      clearPasswordChangeCookie(req, res);

      return res.status(401).json({
        success: false,
        code: "INVALID_PASSWORD_CHANGE_TOKEN",
        message: "Invalid password change session.",
      });
    }

    // 8. Find user
    const user = await UserModel.findById(decoded._id);

    if (!user) {
      clearPasswordChangeCookie(req, res);

      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // 9. Check account status
    if (!user.isActive) {
      clearPasswordChangeCookie(req, res);

      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message:
          "Your account has been disabled. Please contact an administrator.",
      });
    }

    // 10. Only allow this flow when a password change is required
    if (!user.mustChangePassword) {
      clearPasswordChangeCookie(req, res);

      return res.status(403).json({
        success: false,
        code: "PASSWORD_CHANGE_NOT_REQUIRED",
        message: "A forced password change is not required for this account.",
      });
    }

    // 11. Prevent reuse of the current and previous passwords
    const previousPasswords = [
      user.password,
      ...(user.passwordHistory || []),
    ].slice(0, 4);

    for (const oldPassword of previousPasswords) {
      if (!oldPassword) continue;

      const isReusedPassword = await comparePassword(newPassword, oldPassword);

      if (isReusedPassword) {
        return res.status(400).json({
          success: false,
          code: "PASSWORD_REUSED",
          message: "You cannot reuse any of your last 3 passwords.",
        });
      }
    }

    // 12. Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // 13. Update password history
    user.passwordHistory = [
      user.password,
      ...(user.passwordHistory || []),
    ].slice(0, 3);

    // 14. Update account state
    user.password = hashedPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    user.passwordResetVerified = false;

    await user.save();

    // 15. Revoke all existing refresh sessions for this user
    await AuthSessionModel.updateMany(
      {
        userId: user._id,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: new Date(),
        },
      },
    );

    // 16. Clear password-change cookie
    clearPasswordChangeCookie(req, res);

    // 17. Require a fresh login
    res.clearCookie("accessToken", getCookieOptions(req));
    res.clearCookie("refreshToken", getCookieOptions(req));

    return res.status(200).json({
      success: true,
      code: "PASSWORD_CHANGED",
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      code: "CHANGE_PASSWORD_FAILED",
      message: "Failed to change password",
    });
  }
};

module.exports = {
  changePassword,
};
