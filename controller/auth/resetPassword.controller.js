const bcrypt = require("bcryptjs");
const UserModel = require("../../model/userModel.js");

const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    // -----------------------------------------
    // 1. Validate required fields
    // -----------------------------------------

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_REQUIRED",
        message: "Reset token is required",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        code: "NEW_PASSWORD_REQUIRED",
        message: "New password is required",
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        code: "CONFIRM_PASSWORD_REQUIRED",
        message: "Confirm password is required",
      });
    }

    // -----------------------------------------
    // 2. Check passwords match
    // -----------------------------------------

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        code: "PASSWORD_MISMATCH",
        message: "Passwords do not match",
      });
    }

    // -----------------------------------------
    // 3. Find user by reset token
    // -----------------------------------------

    const user = await UserModel.findOne({
      passwordResetToken: resetToken,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        code: "INVALID_RESET_TOKEN",
        sessionExpired: true,
        message:
          "Invalid or expired password reset session. Please start again.",
      });
    }

    // -----------------------------------------
    // 4. Check reset token expiry
    // -----------------------------------------

    if (
      !user.passwordResetExpires ||
      new Date() > new Date(user.passwordResetExpires)
    ) {
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      user.passwordResetVerified = false;

      user.otp = null;
      user.expiresAt = null;
      user.otpRequestedAt = null;
      user.isUsed = false;

      await user.save();

      return res.status(400).json({
        success: false,
        code: "RESET_SESSION_EXPIRED",
        sessionExpired: true,
        message:
          "Your password reset session has expired. Please request a new OTP.",
      });
    }

    // -----------------------------------------
    // 5. OTP must already be verified
    // -----------------------------------------

    if (!user.passwordResetVerified) {
      return res.status(400).json({
        success: false,
        code: "OTP_NOT_VERIFIED",
        message: "Please verify the OTP before resetting your password.",
      });
    }

    // -----------------------------------------
    // 6. Validate password strength
    // -----------------------------------------

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

    // -----------------------------------------
    // 7. Check current password
    // -----------------------------------------

    if (user.password) {
      const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);

      if (isSameAsCurrent) {
        return res.status(400).json({
          success: false,
          code: "PASSWORD_REUSED",
          message:
            "You cannot use your current password. Please choose a different password.",
        });
      }
    }

    // -----------------------------------------
    // 8. Check previous 3 passwords
    // -----------------------------------------

    const passwordHistory = Array.isArray(user.passwordHistory)
      ? user.passwordHistory
      : [];

    for (const previousPasswordHash of passwordHistory) {
      const isReused = await bcrypt.compare(newPassword, previousPasswordHash);

      if (isReused) {
        return res.status(400).json({
          success: false,
          code: "PASSWORD_REUSED",
          message:
            "You cannot reuse any of your last 3 passwords. Please choose a different password.",
        });
      }
    }

    // -----------------------------------------
    // 9. Hash the new password
    // -----------------------------------------

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // -----------------------------------------
    // 10. Save old password in history
    // -----------------------------------------

    if (user.password) {
      user.passwordHistory = [user.password, ...passwordHistory].slice(0, 3);
    }

    // -----------------------------------------
    // 11. Update password
    // -----------------------------------------

    user.password = hashedPassword;
    user.passwordChangedAt = new Date();

    // -----------------------------------------
    // 12. Invalidate reset session
    // -----------------------------------------

    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.passwordResetVerified = false;

    user.otp = null;
    user.expiresAt = null;
    user.otpRequestedAt = null;
    user.isUsed = false;

    // -----------------------------------------
    // 13. Reset login lock state
    // -----------------------------------------

    user.loginAttempts = 0;
    user.lockUntil = null;

    // -----------------------------------------
    // 14. Save
    // -----------------------------------------

    await user.save();

    return res.status(200).json({
      success: true,
      code: "PASSWORD_RESET_SUCCESS",
      message:
        "Password has been reset successfully. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      code: "PASSWORD_RESET_FAILED",
      message: "Failed to reset password",
    });
  }
};

module.exports = {
  resetPassword,
};
