const jwt = require("jsonwebtoken");

const UserModel = require("../../model/userModel.js");
const {
  hashPassword,
  comparePassword,
} = require("../../helper/passwordHash.js");

const changePassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    // ==================================================
    // 1. Validate request
    // ==================================================

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        code: "PASSWORD_REQUIRED",
        message: "New password and confirm password are required",
      });
    }

    // ==================================================
    // 2. Check password match
    // ==================================================

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: "PASSWORD_MISMATCH",
        message: "Passwords do not match",
      });
    }

    // ==================================================
    // 3. Validate password strength
    // ==================================================

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

    // ==================================================
    // 4. Get password-change token
    // ==================================================

    const passwordChangeToken = req.cookies?.passwordChangeToken;

    if (!passwordChangeToken) {
      return res.status(401).json({
        success: false,
        code: "PASSWORD_CHANGE_SESSION_EXPIRED",
        message: "Password change session has expired. Please login again.",
      });
    }

    // ==================================================
    // 5. Verify password-change token
    // ==================================================

    let decoded;

    try {
      decoded = jwt.verify(passwordChangeToken, process.env.JWT_SECURE);
    } catch (error) {
      res.clearCookie("passwordChangeToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.status(401).json({
        success: false,
        code: "PASSWORD_CHANGE_SESSION_EXPIRED",
        message: "Password change session has expired. Please login again.",
      });
    }

    // ==================================================
    // 6. Verify token purpose
    // ==================================================

    if (!decoded?._id || decoded.purpose !== "PASSWORD_CHANGE") {
      res.clearCookie("passwordChangeToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.status(401).json({
        success: false,
        code: "INVALID_PASSWORD_CHANGE_TOKEN",
        message: "Invalid password change session.",
      });
    }

    // ==================================================
    // 7. Find user
    // ==================================================

    const user = await UserModel.findById(decoded._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // ==================================================
    // 8. Check account status
    // ==================================================

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message:
          "Your account has been disabled. Please contact an administrator.",
      });
    }

    // ==================================================
    // 9. Check last 3 passwords
    // ==================================================

    const previousPasswords = [
      user.password,
      ...(user.passwordHistory || []),
    ].slice(0, 4);

    for (const oldPassword of previousPasswords) {
      const isReusedPassword = await comparePassword(newPassword, oldPassword);

      if (isReusedPassword) {
        return res.status(400).json({
          success: false,
          code: "PASSWORD_REUSED",
          message: "You cannot reuse any of your last 3 passwords.",
        });
      }
    }

    // ==================================================
    // 10. Hash new password
    // ==================================================

    const hashedPassword = await hashPassword(newPassword);

    // ==================================================
    // 11. Update password history
    // ==================================================

    const updatedPasswordHistory = [
      user.password,
      ...(user.passwordHistory || []),
    ].slice(0, 3);

    user.passwordHistory = updatedPasswordHistory;

    // ==================================================
    // 12. Update password/account state
    // ==================================================

    user.password = hashedPassword;

    user.mustChangePassword = false;

    user.passwordChangedAt = new Date();

    // Password was successfully changed.
    user.passwordResetVerified = false;

    // ==================================================
    // 13. Save user
    // ==================================================

    await user.save();

    // ==================================================
    // 14. Clear password-change session
    // ==================================================

    res.clearCookie("passwordChangeToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // ==================================================
    // 15. Return success
    // ==================================================

    return res.status(200).json({
      success: true,
      code: "PASSWORD_CHANGED",
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

module.exports = {
  changePassword,
};
