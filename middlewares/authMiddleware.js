const jwt = require("jsonwebtoken");

const requiredSignIn = (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECURE);

    if (!decoded?._id) {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      code: "INVALID_OR_EXPIRED_TOKEN",
      message: "Authentication token is invalid or expired",
    });
  }
};

module.exports = {
  requiredSignIn,
};
