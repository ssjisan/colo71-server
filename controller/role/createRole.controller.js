const Role = require("../../model/roleModel.js");
const UserModel = require("../../model/userModel.js");

const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const authUser = req.user;

    // ---------------------------
    // Validate role name
    // ---------------------------
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        code: "ROLE_NAME_REQUIRED",
        message: "Role name is required",
      });
    }

    // ---------------------------
    // Find authenticated user
    // ---------------------------
    const author = await UserModel.findById(authUser._id).select(
      "name email _id",
    );

    if (!author) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "Authenticated user not found",
      });
    }

    // ---------------------------
    // Check duplicate role name
    // ---------------------------
    const existingRole = await Role.findOne({
      name: name.trim(),
    });

    if (existingRole) {
      return res.status(409).json({
        success: false,
        code: "ROLE_NAME_ALREADY_EXISTS",
        message: "A role with this name already exists",
      });
    }

    // ---------------------------
    // Create role
    // ---------------------------
    const role = new Role({
      name: name.trim(),
      description: description?.trim() || "",
      permissions: Array.isArray(permissions) ? permissions : [],

      createdBy: {
        userId: author._id,
        name: author.name,
        email: author.email,
      },

      isRoot: false,
      isActive: true,
    });

    await role.save();

    // ---------------------------
    // Response
    // ---------------------------
    return res.status(201).json({
      success: true,
      code: "ROLE_CREATED",
      message: "Role created successfully",
      data: role,
    });
  } catch (error) {
    console.error("Create role error:", error);

    // MongoDB duplicate key protection
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "ROLE_NAME_ALREADY_EXISTS",
        message: "A role with this name already exists",
      });
    }

    return res.status(500).json({
      success: false,
      code: "ROLE_CREATE_FAILED",
      message: "Failed to create role",
    });
  }
};

module.exports = {
  createRole,
};
