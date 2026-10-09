const mongoose = require("mongoose");
const UserModel = require("../../model/userModel.js");

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_USER_ID",
        message: "Invalid user ID",
      });
    }

    // Find the user
    const user = await UserModel.findById(id).populate({
      path: "role",
      select: "name isRoot",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // Root user cannot be deleted
    if (user.role?.isRoot === true) {
      return res.status(403).json({
        success: false,
        code: "ROOT_USER_CANNOT_BE_DELETED",
        message: "Root user cannot be deleted",
      });
    }

    await UserModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      code: "USER_DELETED",
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      success: false,
      code: "USER_DELETE_FAILED",
      message: "Failed to delete user",
    });
  }
};

module.exports = {
  deleteUser,
};
