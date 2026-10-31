const UserModel = require("../../model/userModel.js");

const getPasswordResetStatus = async (req, res) => {
  try {
    const { resetToken } = req.body;

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    const user = await UserModel.findOne({
      passwordResetToken: resetToken,
    });

    if (
      !user ||
      !user.passwordResetExpires ||
      Date.now() >= new Date(user.passwordResetExpires).getTime()
    ) {
      return res.status(400).json({
        success: false,
        code: "RESET_SESSION_EXPIRED",
        sessionExpired: true,
        message: "Your password reset session has expired.",
      });
    }

    if (user.passwordResetVerified) {
      return res.status(400).json({
        success: false,
        code: "OTP_ALREADY_VERIFIED",
        message: "OTP has already been verified.",
      });
    }

    const requestedAt = user.otpRequestedAt
      ? new Date(user.otpRequestedAt).getTime()
      : Date.now();

    const otpExpiresAt = user.expiresAt
      ? new Date(user.expiresAt).getTime()
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        otpExpiresAt,
        resendAvailableAt: requestedAt + 90 * 1000,
      },
    });
  } catch (error) {
    console.error("Password reset status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve password reset status.",
    });
  }
};

module.exports = { getPasswordResetStatus };
