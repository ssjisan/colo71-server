const UserModel = require("../../model/userModel.js");

const getMe = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const user = await UserModel.findById(userId)
      .select(
        [
          "-password",
          "-passwordHistory",
          "-otp",
          "-expiresAt",
          "-otpRequestedAt",
          "-isUsed",
          "-passwordResetToken",
          "-passwordResetExpires",
          "-passwordResetVerified",
          "-loginAttempts",
          "-lockUntil",
        ].join(" "),
      )
      .populate({
        path: "role",
        populate: {
          path: "permissions.page",
        },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message: "Your account has been disabled",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role?._id || user.role || null,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      },
      permissions: user.role?.permissions || [],
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      code: "GET_CURRENT_USER_FAILED",
      message: "Failed to get current user",
    });
  }
};

module.exports = {
  getMe,
};
