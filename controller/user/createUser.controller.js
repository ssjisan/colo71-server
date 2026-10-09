const UserModel = require("../../model/userModel.js");
const RoleModel = require("../../model/roleModel.js");
const { hashPassword } = require("../../helper/passwordHash.js");

const createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // --------------------------------------------------
    // 1. Validate required fields
    // --------------------------------------------------
    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: "Name, email and role are required",
      });
    }

    // --------------------------------------------------
    // 2. Clean input
    // --------------------------------------------------
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // --------------------------------------------------
    // 3. Validate name
    // --------------------------------------------------
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 50 characters",
      });
    }

    // --------------------------------------------------
    // 4. Validate email
    // --------------------------------------------------
    const emailRegex = /^\S+@\S+\.\S+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // --------------------------------------------------
    // 5. Check if user already exists
    // --------------------------------------------------
    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // --------------------------------------------------
    // 6. Check if selected role exists
    // --------------------------------------------------
    const selectedRole = await RoleModel.findById(role);

    if (!selectedRole) {
      return res.status(404).json({
        success: false,
        message: "Selected role not found",
      });
    }

    // --------------------------------------------------
    // 7. Check if selected role is active
    // --------------------------------------------------
    if (!selectedRole.isActive) {
      return res.status(400).json({
        success: false,
        message: "Selected role is inactive",
      });
    }

    // --------------------------------------------------
    // 8. Default password
    // --------------------------------------------------
    const defaultPassword = "12345678";

    // --------------------------------------------------
    // 9. Hash default password
    // --------------------------------------------------
    const hashedPassword = await hashPassword(defaultPassword);

    // --------------------------------------------------
    // 10. Create user
    // --------------------------------------------------
    const user = await UserModel.create({
      name: trimmedName,
      email: normalizedEmail,
      role: selectedRole._id,

      // Default password is always hashed
      password: hashedPassword,

      // User must change default password
      mustChangePassword: true,

      // User has not changed their password yet
      passwordChangedAt: null,

      // No password history yet
      passwordHistory: [],

      // Account starts active
      isActive: true,

      // Login security starts clean
      loginAttempts: 0,
      lockUntil: null,

      // User hasn't logged in yet
      lastLogin: null,

      // Password reset state
      passwordResetVerified: false,
    });

    // --------------------------------------------------
    // 11. Return safe user information
    // Never return password/hash
    // --------------------------------------------------
    return res.status(201).json({
      success: true,
      message: "User account created successfully",

      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,

        mustChangePassword: user.mustChangePassword,
        isActive: user.isActive,

        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    // --------------------------------------------------
    // 12. Handle MongoDB duplicate key
    // --------------------------------------------------
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // --------------------------------------------------
    // 13. Server error
    // --------------------------------------------------
    return res.status(500).json({
      success: false,
      message: "Failed to create user account",
    });
  }
};

module.exports = {
  createUser,
};
