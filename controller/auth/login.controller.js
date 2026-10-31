const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const UserModel = require("../../model/userModel.js");
const AuthSessionModel = require("../../model/authSessionModel.js");
const { comparePassword } = require("../../helper/passwordHash.js");
const { getCookieOptions } = require("../../helper/getCookieOptions.js");

const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "15d";
const PASSWORD_CHANGE_TOKEN_EXPIRES = "10m";

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 15 * 24 * 60 * 60 * 1000;
const PASSWORD_CHANGE_TOKEN_MAX_AGE = 10 * 60 * 1000;

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION = 5 * 60 * 1000;

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_REQUEST",
        message: "Email and password are required",
      });
    }

    if (!process.env.JWT_SECURE) {
      throw new Error("JWT_SECURE is not configured");
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await UserModel.findOne({
      email: normalizedEmail,
    }).populate({
      path: "role",
      populate: {
        path: "permissions.page",
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message:
          "Your account has been disabled. Please contact an administrator.",
      });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingSeconds = Math.ceil(
        (user.lockUntil.getTime() - Date.now()) / 1000,
      );

      return res.status(423).json({
        success: false,
        code: "ACCOUNT_TEMPORARILY_LOCKED",
        message: "Too many failed login attempts. Please try again later.",
        lockUntil: user.lockUntil,
        remainingSeconds,
        remainingMinutes: Math.ceil(remainingSeconds / 60),
      });
    }

    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.lockUntil = null;
      user.loginAttempts = 0;
    }

    const passwordMatched = await comparePassword(password, user.password);

    if (!passwordMatched) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;

      if (user.loginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION);
        await user.save();

        return res.status(423).json({
          success: false,
          code: "ACCOUNT_TEMPORARILY_LOCKED",
          message:
            "Too many failed login attempts. Your account has been temporarily locked for 5 minutes.",
          lockUntil: user.lockUntil,
          remainingSeconds: 300,
          remainingMinutes: 5,
        });
      }

      await user.save();

      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
        loginAttempts: user.loginAttempts,
        attemptsRemaining: Math.max(
          0,
          MAX_FAILED_ATTEMPTS - user.loginAttempts,
        ),
      });
    }

    user.loginAttempts = 0;
    user.lockUntil = null;

    const cookieOptions = getCookieOptions(req);

    // Forced password change: do not create a normal login session.
    if (user.mustChangePassword) {
      const passwordChangeToken = jwt.sign(
        {
          _id: user._id.toString(),
          purpose: "PASSWORD_CHANGE",
        },
        process.env.JWT_SECURE,
        { expiresIn: PASSWORD_CHANGE_TOKEN_EXPIRES },
      );

      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);

      res.cookie("passwordChangeToken", passwordChangeToken, {
        ...cookieOptions,
        maxAge: PASSWORD_CHANGE_TOKEN_MAX_AGE,
      });

      await user.save();

      return res.status(200).json({
        success: true,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before continuing.",
        mustChangePassword: true,
      });
    }

    const roleId = user.role?._id || user.role;

    if (!roleId) {
      return res.status(403).json({
        success: false,
        code: "ROLE_NOT_ASSIGNED",
        message: "Your account does not have a valid role.",
      });
    }

    // Create a fixed 15-day server-side session.
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE);

    await AuthSessionModel.create({
      sessionId,
      userId: user._id,
      expiresAt: sessionExpiresAt,
    });

    const accessToken = jwt.sign(
      {
        _id: user._id.toString(),
        role: roleId.toString(),
      },
      process.env.JWT_SECURE,
      { expiresIn: ACCESS_TOKEN_EXPIRES },
    );

    const refreshToken = jwt.sign(
      {
        _id: user._id.toString(),
        type: "refresh",
        sid: sessionId,
      },
      process.env.JWT_SECURE,
      { expiresIn: REFRESH_TOKEN_EXPIRES },
    );

    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    res.clearCookie("passwordChangeToken", cookieOptions);

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      code: "LOGIN_SUCCESS",
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      },
      permissions: user.role?.permissions || [],
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      code: "LOGIN_FAILED",
      message: "Login failed. Please try again later.",
    });
  }
};

module.exports = { loginUser };
