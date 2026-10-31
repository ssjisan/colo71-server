const { getCookieOptions } = require("../../helper/getCookieOptions.js");
const AuthSessionModel = require("../../model/authSessionModel.js");

const logout = async (req, res) => {
  try {
    const cookieOptions = getCookieOptions(req);
    const refreshToken = req.cookies?.refreshToken;

    // Revoke the current server-side session.
    if (refreshToken && process.env.JWT_SECURE) {
      const jwt = require("jsonwebtoken");

      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECURE);

        if (decoded?.type === "refresh" && decoded?.sid && decoded?._id) {
          await AuthSessionModel.updateOne(
            {
              sessionId: decoded.sid,
              userId: decoded._id,
              revokedAt: null,
            },
            {
              $set: { revokedAt: new Date() },
            },
          );
        }
      } catch (tokenError) {
        // An invalid or expired token cannot identify a valid session.
        // Cookies will still be cleared below.
      }
    }

    // Clear authentication cookies even if the refresh token is missing.
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
    res.clearCookie("passwordChangeToken", cookieOptions);

    return res.status(200).json({
      success: true,
      code: "LOGOUT_SUCCESS",
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      code: "LOGOUT_FAILED",
      message: "Failed to log out",
    });
  }
};

module.exports = { logout };
