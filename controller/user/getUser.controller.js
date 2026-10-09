const mongoose = require("mongoose");
const UserModel = require("../../model/userModel.js");

const getUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_USER_ID",
        message: "Invalid user ID",
      });
    }

    // Find user and populate role
    const user = await UserModel.findById(id)
      .select(
        "-password -passwordHistory -otp -passwordResetToken -passwordResetExpires",
      )
      .populate({
        path: "role",
        select: "name description isRoot isActive",
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      code: "USER_FETCHED",
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      success: false,
      code: "USER_FETCH_FAILED",
      message: "Failed to fetch user",
    });
  }
};

module.exports = { getUser };
