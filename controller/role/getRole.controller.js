const Role = require("../../model/roleModel");

const getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate(
      "permissions.page",
      "name path",
    );

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(role);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getRole,
};
