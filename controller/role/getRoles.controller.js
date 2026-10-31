const Role = require("../../model/roleModel");

const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().populate("permissions.page", "name path");

    res.json(roles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getRoles,
};
