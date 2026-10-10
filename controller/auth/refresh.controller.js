const jwt = require("jsonwebtoken");

const UserModel = require("../../model/userModel.js");

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const isProduction = process.env.NODE_ENV === "production";

    const authCookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    };
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        code: "REFRESH_TOKEN_MISSING",
        message: "Refresh token not found",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECURE);
    } catch (error) {
      return res.status(401).json({
        success: false,
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token is invalid or expired",
      });
    }

    if (!decoded?._id || decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
      });
    }

    const user = await UserModel.findById(decoded._id);

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

    if (user.mustChangePassword) {
      return res.status(403).json({
        success: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password first",
      });
    }

    const newAccessToken = jwt.sign(
      {
        _id: user._id.toString(),
        role: user.role.toString(),
      },
      process.env.JWT_SECURE,
      {
        expiresIn: "15m",
      },
    );

    res.cookie("accessToken", newAccessToken, {
      ...authCookieOptions,
      maxAge: 15 * 60 * 1000,
    });
    return res.status(200).json({
      success: true,
      code: "TOKEN_REFRESHED",
      message: "Access token refreshed",
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to refresh access token",
    });
  }
};

module.exports = {
  refreshAccessToken,
};
