const jwt = require("jsonwebtoken");
const { getCookieOptions } = require("../../helper/getCookieOptions.js");
const UserModel = require("../../model/userModel.js");
const AuthSessionModel = require("../../model/authSessionModel.js");

const ACCESS_TOKEN_EXPIRES = "15m";
const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    const cookieOptions = getCookieOptions(req);

    if (!process.env.JWT_SECURE) {
      return res.status(500).json({
        success: false,
        code: "AUTH_CONFIG_ERROR",
        message: "Authentication is not configured correctly",
      });
    }

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
    } catch {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      return res.status(401).json({
        success: false,
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token is invalid or expired",
      });
    }

    if (
      !decoded?._id ||
      decoded.type !== "refresh" ||
      !decoded.sid ||
      !decoded.iat
    ) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      return res.status(401).json({
        success: false,
        code: "INVALID_REFRESH_TOKEN",
        message: "Invalid refresh token",
      });
    }

    // Verify the session is still active in MongoDB.
    const session = await AuthSessionModel.findOne({
      sessionId: decoded.sid,
      userId: decoded._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      return res.status(401).json({
        success: false,
        code: "SESSION_INVALID",
        message:
          "Your session has expired or been revoked. Please log in again.",
      });
    }

    // Also enforce the original refresh-token lifetime.
    const tokenAgeSeconds = Math.floor(Date.now() / 1000) - decoded.iat;

    if (tokenAgeSeconds < 0 || tokenAgeSeconds >= 15 * 24 * 60 * 60) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      return res.status(401).json({
        success: false,
        code: "REFRESH_SESSION_EXPIRED",
        message: "Your session has expired. Please log in again.",
      });
    }

    const user = await UserModel.findById(decoded._id).populate("role");

    if (!user || !user.isActive) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      return res.status(401).json({
        success: false,
        code: "ACCOUNT_UNAVAILABLE",
        message: "Your account is unavailable. Please log in again.",
      });
    }

    if (user.mustChangePassword) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      return res.status(403).json({
        success: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password first",
      });
    }

    const roleId = user.role?._id || user.role;

    if (!roleId) {
      return res.status(403).json({
        success: false,
        code: "ROLE_NOT_ASSIGNED",
        message: "Your account does not have a valid role",
      });
    }

    const newAccessToken = jwt.sign(
      {
        _id: user._id.toString(),
        role: roleId.toString(),
      },
      process.env.JWT_SECURE,
      { expiresIn: ACCESS_TOKEN_EXPIRES },
    );

    res.cookie("accessToken", newAccessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
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
      code: "REFRESH_FAILED",
      message: "Failed to refresh access token",
    });
  }
};

module.exports = { refreshAccessToken };
