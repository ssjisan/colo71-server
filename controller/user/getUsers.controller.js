const UserModel = require("../../model/userModel.js");

const getUsers = async (req, res) => {
  try {
    const users = await UserModel.find({})
      .select(
        "-password -passwordHistory -otp -passwordResetToken -passwordResetExpires",
      )
      .populate({
        path: "role",
        select: "name description isRoot isActive",
      })
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      code: "USERS_FETCHED",
      message: "Users fetched successfully",
      users,
      total: users.length,
    });
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      success: false,
      code: "USERS_FETCH_FAILED",
      message: "Failed to fetch users",
    });
  }
};

module.exports = {
  getUsers,
};
