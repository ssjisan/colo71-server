const jwt = require("jsonwebtoken");

const requiredSignIn = (req, res, next) => {
  const token = req.cookies?.accessToken;

  // 1. Require an access-token cookie
  if (!token) {
    return res.status(401).json({
      success: false,
      code: "UNAUTHORIZED",
      message: "Authentication required",
    });
  }

  // 2. Ensure JWT configuration exists
  if (!process.env.JWT_SECURE) {
    console.error("JWT_SECURE is not configured");

    return res.status(500).json({
      success: false,
      code: "AUTH_CONFIG_ERROR",
      message: "Authentication is not configured correctly",
    });
  }

  try {
    // 3. Verify JWT signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECURE);

    // 4. Validate required claims
    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded._id !== "string" ||
      !decoded._id
    ) {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      });
    }

    // 5. Attach verified claims for downstream middleware/controllers
    req.user = decoded;

    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Authentication token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      code: "AUTH_ERROR",
      message: "Unable to verify authentication",
    });
  }
};

module.exports = {
  requiredSignIn,
};
