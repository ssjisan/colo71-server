const mongoose = require("mongoose");
const UserModel = require("../../model/userModel.js");
const RoleModel = require("../../model/roleModel.js");

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    // --------------------------------
    // Validate User ID
    // --------------------------------
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_USER_ID",
        message: "Invalid user ID",
      });
    }

    // --------------------------------
    // Validate required fields
    // --------------------------------
    if (!name || !name.trim() || !email || !email.trim() || !role) {
      return res.status(400).json({
        success: false,
        code: "REQUIRED_FIELDS_MISSING",
        message: "Name, email and role are required",
      });
    }

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // --------------------------------
    // Validate name
    // --------------------------------
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({
        success: false,
        code: "INVALID_NAME",
        message: "Name must be between 2 and 50 characters",
      });
    }

    // --------------------------------
    // Validate email
    // --------------------------------
    const emailRegex = /^\S+@\S+\.\S+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_EMAIL",
        message: "Please provide a valid email address",
      });
    }

    // --------------------------------
    // Find existing user
    // --------------------------------
    const user = await UserModel.findById(id).populate({
      path: "role",
      select: "name isRoot isActive",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // --------------------------------
    // Root user protection
    // --------------------------------
    // A Root user cannot be edited by
    // a normal user.
    const authUser = await UserModel.findById(req.user._id).populate({
      path: "role",
      select: "name isRoot",
    });

    if (!authUser) {
      return res.status(401).json({
        success: false,
        code: "AUTH_USER_NOT_FOUND",
        message: "Authenticated user not found",
      });
    }

    if (user.role?.isRoot === true && authUser.role?.isRoot !== true) {
      return res.status(403).json({
        success: false,
        code: "ROOT_USER_CANNOT_BE_UPDATED",
        message: "Only a root user can update a root user",
      });
    }

    // --------------------------------
    // Check email uniqueness
    // --------------------------------
    const existingUser = await UserModel.findOne({
      email: normalizedEmail,
      _id: { $ne: id },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists",
      });
    }

    // --------------------------------
    // Validate selected role
    // --------------------------------
    const selectedRole = await RoleModel.findById(role);

    if (!selectedRole) {
      return res.status(404).json({
        success: false,
        code: "ROLE_NOT_FOUND",
        message: "Selected role not found",
      });
    }

    if (!selectedRole.isActive) {
      return res.status(400).json({
        success: false,
        code: "ROLE_INACTIVE",
        message: "Selected role is inactive",
      });
    }

    // --------------------------------
    // Prevent changing Root user's role
    // unless authenticated user is Root
    // --------------------------------
    if (
      user.role?.isRoot === true &&
      selectedRole.isRoot !== true &&
      authUser.role?.isRoot !== true
    ) {
      return res.status(403).json({
        success: false,
        code: "ROOT_ROLE_CHANGE_DENIED",
        message: "Only a root user can change a root user's role",
      });
    }

    // --------------------------------
    // Update user
    // --------------------------------
    user.name = trimmedName;
    user.email = normalizedEmail;
    user.role = selectedRole._id;
    user.isActive = Boolean(isActive);

    // --------------------------------
    // If account is disabled,
    // clear active login lock state
    // --------------------------------
    if (!user.isActive) {
      user.lockUntil = null;
      user.loginAttempts = 0;
    }

    await user.save();

    // --------------------------------
    // Response
    // --------------------------------
    return res.status(200).json({
      success: true,
      code: "USER_UPDATED",
      message: "User updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: {
          _id: selectedRole._id,
          name: selectedRole.name,
          description: selectedRole.description,
          isRoot: selectedRole.isRoot,
          isActive: selectedRole.isActive,
        },
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        passwordChangedAt: user.passwordChangedAt,
        lastLogin: user.lastLogin,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_ALREADY_EXISTS",
        message: "An account with this email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      code: "USER_UPDATE_FAILED",
      message: "Failed to update user",
    });
  }
};

module.exports = { updateUser };
