const mongoose = require("mongoose");
const Role = require("../../model/roleModel.js");
const UserModel = require("../../model/userModel.js");

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate role ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ROLE_ID",
        message: "Invalid role ID",
      });
    }

    // Find role
    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        code: "ROLE_NOT_FOUND",
        message: "Role not found",
      });
    }

    // Root role cannot be deleted
    if (role.isRoot) {
      return res.status(403).json({
        success: false,
        code: "ROOT_ROLE_CANNOT_BE_DELETED",
        message: "Root role cannot be deleted",
      });
    }

    // Check whether any user is assigned to this role
    const userWithRole = await UserModel.exists({
      role: id,
    });

    if (userWithRole) {
      return res.status(400).json({
        success: false,
        code: "ROLE_IN_USE",
        message: "Cannot delete role. It is assigned to one or more users.",
      });
    }

    // Delete role
    await Role.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      code: "ROLE_DELETED",
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("Delete role error:", error);

    return res.status(500).json({
      success: false,
      code: "ROLE_DELETE_FAILED",
      message: "Failed to delete role",
    });
  }
};

module.exports = {
  deleteRole,
};
