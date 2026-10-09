const jwt = require("jsonwebtoken");

const UserModel = require("../../model/userModel.js");
const { comparePassword } = require("../../helper/passwordHash.js");

const DEFAULT_PASSWORD = "12345678";

const ACCESS_TOKEN_EXPIRES = "15m";
const REFRESH_TOKEN_EXPIRES = "30d";
const PASSWORD_CHANGE_TOKEN_EXPIRES = "10m";

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ==================================================
    // 1. Validate request
    // ==================================================

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ==================================================
    // 2. Normalize email
    // ==================================================

    const normalizedEmail = email.trim().toLowerCase();

    // ==================================================
    // 3. Find user
    // ==================================================

    const user = await UserModel.findOne({
      email: normalizedEmail,
    }).populate({
      path: "role",
      populate: {
        path: "permissions.page",
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "No user found with this email",
      });
    }

    // ==================================================
    // 4. Check account status
    // ==================================================

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_DISABLED",
        message:
          "Your account has been disabled. Please contact an administrator.",
      });
    }

    // ==================================================
    // 5. Check temporary lock
    // ==================================================

    if (user.lockUntil) {
      const now = new Date();

      // Account is still locked
      if (user.lockUntil > now) {
        const remainingMilliseconds = user.lockUntil.getTime() - now.getTime();

        const remainingSeconds = Math.ceil(remainingMilliseconds / 1000);

        const remainingMinutes = Math.ceil(remainingSeconds / 60);

        return res.status(423).json({
          success: false,
          code: "ACCOUNT_TEMPORARILY_LOCKED",
          message: "Too many failed login attempts. Please try again later.",
          lockUntil: user.lockUntil,
          remainingSeconds,
          remainingMinutes,
        });
      }

      // Temporary lock expired.
      // We intentionally DO NOT reset loginAttempts.
      //
      // Example:
      // 3 wrong → 5 minute lock
      // lock expires → attempt 4
      // attempt 5 → account disabled

      user.lockUntil = null;

      await user.save();
    }

    // ==================================================
    // 6. Compare password
    // ==================================================

    const passwordMatched = await comparePassword(password, user.password);

    // ==================================================
    // 7. Wrong password
    // ==================================================

    if (!passwordMatched) {
      user.loginAttempts += 1;

      // --------------------------------------------------
      // 3rd wrong attempt → lock for 5 minutes
      // --------------------------------------------------

      if (user.loginAttempts === 3) {
        user.lockUntil = new Date(Date.now() + 5 * 60 * 1000);

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

      // --------------------------------------------------
      // 5th wrong attempt → disable account
      // --------------------------------------------------

      if (user.loginAttempts >= 5) {
        user.isActive = false;
        user.lockUntil = null;

        await user.save();

        return res.status(403).json({
          success: false,
          code: "ACCOUNT_DISABLED",
          message:
            "Your account has been disabled due to multiple failed login attempts. Please contact an administrator.",
        });
      }

      // --------------------------------------------------
      // Normal wrong-password response
      // --------------------------------------------------

      await user.save();

      return res.status(401).json({
        success: false,
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
        loginAttempts: user.loginAttempts,
        attemptsRemaining: Math.max(0, 3 - user.loginAttempts),
      });
    }

    // ==================================================
    // 8. PASSWORD IS CORRECT
    // ==================================================

    // Successful password verification resets
    // failed login tracking.

    user.loginAttempts = 0;
    user.lockUntil = null;

    // ==================================================
    // 9. FIRST-TIME / DEFAULT PASSWORD LOGIN
    // ==================================================

    const isFirstLogin =
      user.mustChangePassword === true && user.passwordChangedAt === null;

    if (isFirstLogin) {
      // --------------------------------------------------
      // First login must use the default password
      // --------------------------------------------------

      if (password !== DEFAULT_PASSWORD) {
        return res.status(401).json({
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        });
      }

      // --------------------------------------------------
      // Create password-change token
      // --------------------------------------------------

      const passwordChangeToken = jwt.sign(
        {
          _id: user._id.toString(),
          purpose: "PASSWORD_CHANGE",
        },
        process.env.JWT_SECURE,
        {
          expiresIn: PASSWORD_CHANGE_TOKEN_EXPIRES,
        },
      );

      // --------------------------------------------------
      // Store password-change token in HttpOnly cookie
      // --------------------------------------------------

      res.cookie("passwordChangeToken", passwordChangeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 10 * 60 * 1000,
      });

      await user.save();

      return res.status(200).json({
        success: true,
        code: "PASSWORD_CHANGE_REQUIRED",
        message:
          "This is your first login. You must change your default password before continuing.",
        firstLogin: true,
        mustChangePassword: true,
      });
    }

    // ==================================================
    // 10. PASSWORD CHANGE REQUIRED
    // ==================================================

    // Handles cases such as an administrator
    // resetting a user's password.

    if (user.mustChangePassword === true) {
      const passwordChangeToken = jwt.sign(
        {
          _id: user._id.toString(),
          purpose: "PASSWORD_CHANGE",
        },
        process.env.JWT_SECURE,
        {
          expiresIn: PASSWORD_CHANGE_TOKEN_EXPIRES,
        },
      );

      res.cookie("passwordChangeToken", passwordChangeToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 10 * 60 * 1000,
      });

      await user.save();

      return res.status(200).json({
        success: true,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before continuing.",
        firstLogin: false,
        mustChangePassword: true,
      });
    }

    // ==================================================
    // 11. NORMAL LOGIN
    // ==================================================

    // At this point:
    //
    // - User exists
    // - Account is active
    // - Password is correct
    // - Password does not require changing

    // --------------------------------------------------
    // Create access token
    // --------------------------------------------------

    const accessToken = jwt.sign(
      {
        _id: user._id.toString(),
        role: user.role.toString(),
      },
      process.env.JWT_SECURE,
      {
        expiresIn: ACCESS_TOKEN_EXPIRES,
      },
    );

    // --------------------------------------------------
    // Create refresh token
    // --------------------------------------------------

    const refreshToken = jwt.sign(
      {
        _id: user._id.toString(),
        type: "refresh",
      },
      process.env.JWT_SECURE,
      {
        expiresIn: REFRESH_TOKEN_EXPIRES,
      },
    );

    // --------------------------------------------------
    // Store access token in HttpOnly cookie
    // --------------------------------------------------

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    // --------------------------------------------------
    // Store refresh token in HttpOnly cookie
    // --------------------------------------------------

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    // --------------------------------------------------
    // Clear any old password-change cookie
    // --------------------------------------------------

    res.clearCookie("passwordChangeToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    // ==================================================
    // 12. Update successful login information
    // ==================================================

    user.lastLogin = new Date();
    user.loginAttempts = 0;
    user.lockUntil = null;

    await user.save();

    // ==================================================
    // 13. Return safe response
    // ==================================================

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
      message: "Login failed",
    });
  }
};

module.exports = {
  loginUser,
};
