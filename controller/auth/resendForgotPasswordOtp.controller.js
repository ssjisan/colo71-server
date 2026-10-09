const UserModel = require("../../model/userModel.js");
const { generateOtp } = require("../../helper/generateOtp.js");
const { generateResetToken } = require("../../helper/generateResetToken.js");
const { sendEmail } = require("../../helper/sendEmail.js");

const {
  passwordResetOtpTemplate,
} = require("../../helper/emailTemplates/passwordResetOtp.template.js");

const resendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // -----------------------------------------
    // 1. Validate email
    // -----------------------------------------

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        code: "EMAIL_REQUIRED",
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------------------
    // 2. Find user
    // -----------------------------------------

    const user = await UserModel.findOne({
      email: normalizedEmail,
    });

    /*
     * Do not reveal whether an email exists.
     */
    if (!user || !user.isActive) {
      return res.status(200).json({
        success: true,
        code: "OTP_RESEND_ACCEPTED",
        message:
          "If an account exists with this email, a new OTP has been sent.",
      });
    }

    // -----------------------------------------
    // 3. Check 90 second resend cooldown
    // -----------------------------------------

    if (user.otpRequestedAt) {
      const now = Date.now();
      const lastRequestedAt = new Date(user.otpRequestedAt).getTime();

      const elapsedSeconds = (now - lastRequestedAt) / 1000;

      const resendCooldown = 90;

      if (elapsedSeconds < resendCooldown) {
        const remainingSeconds = Math.ceil(resendCooldown - elapsedSeconds);

        return res.status(429).json({
          success: false,
          code: "OTP_RESEND_COOLDOWN",
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
          data: {
            retryAfter: remainingSeconds,
          },
        });
      }
    }

    // -----------------------------------------
    // 4. Generate NEW OTP
    // -----------------------------------------

    const otp = generateOtp();

    // -----------------------------------------
    // 5. Generate NEW reset token
    // -----------------------------------------

    const resetToken = generateResetToken();

    // -----------------------------------------
    // 6. OTP expires in 10 minutes
    // -----------------------------------------

    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // -----------------------------------------
    // 7. Reset session expires in 15 minutes
    // -----------------------------------------

    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // -----------------------------------------
    // 8. Update password reset session
    // -----------------------------------------

    user.otp = otp;
    user.expiresAt = otpExpiresAt;

    user.otpRequestedAt = new Date();

    user.isUsed = false;

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiresAt;

    user.passwordResetVerified = false;

    await user.save();

    // -----------------------------------------
    // 9. Generate email
    // -----------------------------------------

    const emailHtml = passwordResetOtpTemplate({
      name: user.name,
      otp,
    });

    // -----------------------------------------
    // 10. Send email
    // -----------------------------------------

    await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      html: emailHtml,
    });

    // -----------------------------------------
    // 11. Response
    // -----------------------------------------

    return res.status(200).json({
      success: true,
      code: "OTP_RESENT",
      message: "A new OTP has been sent to your email.",
      data: {
        resetToken,
        expiresIn: 10 * 60,
        resendAvailableIn: 90,
      },
    });
  } catch (error) {
    console.error("Resend forgot password OTP error:", error);

    return res.status(500).json({
      success: false,
      code: "OTP_RESEND_FAILED",
      message: "Failed to resend OTP. Please try again.",
    });
  }
};

module.exports = {
  resendForgotPasswordOtp,
};
