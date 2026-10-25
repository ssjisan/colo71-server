const UserModel = require("../../model/userModel.js");
const AuthSessionModel = require("../../model/authSessionModel.js");
const {
  comparePassword,
  hashPassword,
} = require("../../helper/passwordHash.js");
const { getCookieOptions } = require("../../helper/getCookieOptions.js");

const validatePassword = (password) => {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
};

const changeOwnPassword = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match",
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must differ from the current password",
      });
    }

    const user = await UserModel.findById(userId).select(
      "+password +passwordHistory",
    );

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is unavailable",
      });
    }

    const currentPasswordMatches = await comparePassword(
      currentPassword,
      user.password,
    );

    if (!currentPasswordMatches) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Prevent reuse of the current password or a previously used password.
    const passwordHistory = user.passwordHistory || [];

    for (const previousEntry of passwordHistory) {
      const previousHash =
        typeof previousEntry === "string"
          ? previousEntry
          : previousEntry?.password;

      if (!previousHash) continue;

      const matchesPreviousPassword = await comparePassword(
        newPassword,
        previousHash,
      );

      if (matchesPreviousPassword) {
        return res.status(400).json({
          success: false,
          message: "You cannot reuse a previous password",
        });
      }
    }

    const hashedPassword = await hashPassword(newPassword);

    // Preserve the old password hash in history.
    user.passwordHistory.push(user.password);
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    // Revoke existing refresh sessions so the user must sign in again.
    await AuthSessionModel.updateMany(
      {
        userId: user._id,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      },
    );

    const cookieOptions = getCookieOptions(req);

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.clearCookie("passwordChangeToken", cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Change own password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

module.exports = { changeOwnPassword };
