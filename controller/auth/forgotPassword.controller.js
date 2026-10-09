const UserModel = require("../../model/userModel.js");

const { generateOtp } = require("../../helper/generateOtp.js");
const { generateResetToken } = require("../../helper/generateResetToken.js");
const { sendEmail } = require("../../helper/sendEmail.js");
const {
  passwordResetOtpTemplate,
} = require("../../helper/emailTemplates/passwordResetOtp.template.js");

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        code: "EMAIL_REQUIRED",
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await UserModel.findOne({
      email: normalizedEmail,
    });

    if (!user || !user.isActive) {
      return res.status(200).json({
        success: true,
        code: "PASSWORD_RESET_OTP_SENT",
        message: "If an account exists with this email, an OTP has been sent.",
      });
    }

    const otp = generateOtp();

    const resetToken = generateResetToken();

    const otpExpiresAt = new Date(Date.now() + 1 * 60 * 1000);

    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.otp = otp;
    user.expiresAt = otpExpiresAt;
    user.otpRequestedAt = new Date();
    user.isUsed = false;

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiresAt;
    user.passwordResetVerified = false;

    await user.save();

    const emailHtml = passwordResetOtpTemplate({
      name: user.name,
      otp,
    });

    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      html: emailHtml,
    });

    return res.status(200).json({
      success: true,
      code: "PASSWORD_RESET_OTP_SENT",
      message: "If an account exists with this email, an OTP has been sent.",
      data: {
        resetToken,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      code: "FORGOT_PASSWORD_FAILED",
      message: "Failed to process password reset request",
    });
  }
};

module.exports = {
  forgotPassword,
};
