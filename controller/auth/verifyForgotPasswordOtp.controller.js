const UserModel = require("../../model/userModel.js");

const verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { resetToken, otp } = req.body;

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        code: "RESET_TOKEN_REQUIRED",
        message: "Reset token is required",
      });
    }

    if (!otp || !otp.trim()) {
      return res.status(400).json({
        success: false,
        code: "OTP_REQUIRED",
        message: "OTP is required",
      });
    }

    const user = await UserModel.findOne({
      passwordResetToken: resetToken,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        code: "INVALID_RESET_TOKEN",
        message: "Invalid or expired password reset session",
      });
    }

    /*
     * Check reset token expiry.
     */
    if (
      !user.passwordResetExpires ||
      new Date() > new Date(user.passwordResetExpires)
    ) {
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      user.otp = null;
      user.expiresAt = null;
      user.otpRequestedAt = null;
      user.isUsed = false;
      user.passwordResetVerified = false;

      await user.save();

      return res.status(400).json({
        success: false,
        code: "RESET_SESSION_EXPIRED",
        message:
          "Password reset session has expired. Please request a new OTP.",
      });
    }

    /*
     * Check OTP expiry.
     */
    if (!user.expiresAt || new Date() > new Date(user.expiresAt)) {
      return res.status(400).json({
        success: false,
        code: "OTP_EXPIRED",
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (user.isUsed) {
      return res.status(400).json({
        success: false,
        code: "OTP_ALREADY_USED",
        message: "This OTP has already been used",
      });
    }

    if (user.otp !== otp.trim()) {
      return res.status(400).json({
        success: false,
        code: "INVALID_OTP",
        message: "Invalid OTP",
      });
    }

    /*
     * OTP verified.
     */
    user.passwordResetVerified = true;

    /*
     * OTP cannot be reused.
     */
    user.isUsed = true;

    /*
     * Clear OTP itself.
     * Reset token remains valid for the password page.
     */
    user.otp = null;
    user.expiresAt = null;
    user.otpRequestedAt = null;

    await user.save();

    return res.status(200).json({
      success: true,
      code: "OTP_VERIFIED",
      message: "OTP verified successfully",
      data: {
        resetToken,
      },
    });
  } catch (error) {
    console.error("Verify forgot password OTP error:", error);

    return res.status(500).json({
      success: false,
      code: "OTP_VERIFICATION_FAILED",
      message: "Failed to verify OTP",
    });
  }
};

module.exports = {
  verifyForgotPasswordOtp,
};
