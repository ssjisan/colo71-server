const mongoose = require("mongoose");
const Role = require("../../model/roleModel.js");
const UserModel = require("../../model/userModel.js");
const Page = require("../../model/pageModel.js");

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    // =====================================================
    // 1. Validate Role ID
    // =====================================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ROLE_ID",
        message: "Invalid role ID",
      });
    }

    // =====================================================
    // 2. Validate Role Name
    // =====================================================

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        code: "ROLE_NAME_REQUIRED",
        message: "Role name is required",
      });
    }

    // =====================================================
    // 3. Get Authenticated User
    // =====================================================

    const authUser = req.user;

    const author = await UserModel.findById(authUser._id)
      .select("name email _id role")
      .populate("role", "name isRoot");

    if (!author) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "Authenticated user not found",
      });
    }

    // =====================================================
    // 4. Find Role Being Updated
    // =====================================================

    const role = await Role.findById(id);

    if (!role) {
      return res.status(404).json({
        success: false,
        code: "ROLE_NOT_FOUND",
        message: "Role not found",
      });
    }

    // =====================================================
    // 5. Root Role Protection
    //
    // Root user can update Root role.
    // Normal users cannot update Root role.
    // =====================================================

    if (role.isRoot && !author.role?.isRoot) {
      return res.status(403).json({
        success: false,
        code: "ROOT_ROLE_CANNOT_BE_UPDATED",
        message: "Only a root user can update the root role",
      });
    }

    // =====================================================
    // 6. Check Duplicate Role Name
    // =====================================================

    const existingRole = await Role.findOne({
      name: name.trim(),
      _id: { $ne: id },
    });

    if (existingRole) {
      return res.status(409).json({
        success: false,
        code: "ROLE_NAME_ALREADY_EXISTS",
        message: "A role with this name already exists",
      });
    }

    // =====================================================
    // 7. Get All Existing Pages
    //
    // This allows newly created pages to be assigned
    // to roles.
    // =====================================================

    const pages = await Page.find({}).select("_id").lean();

    const validPageIds = new Set(pages.map((page) => page._id.toString()));

    // =====================================================
    // 8. Validate Incoming Permissions
    // =====================================================

    const incomingPermissions = Array.isArray(permissions) ? permissions : [];

    // Only keep permissions whose page still exists
    const validPermissions = incomingPermissions.filter((permission) => {
      if (!permission?.page) {
        return false;
      }

      const pageId = permission.page.toString();

      return validPageIds.has(pageId);
    });

    // =====================================================
    // 9. Remove Duplicate Page Permissions
    // =====================================================

    const uniquePermissions = [];
    const processedPageIds = new Set();

    for (const permission of validPermissions) {
      const pageId = permission.page.toString();

      // Skip duplicate page
      if (processedPageIds.has(pageId)) {
        continue;
      }

      processedPageIds.add(pageId);

      uniquePermissions.push({
        page: permission.page,

        canView: Boolean(permission.canView),

        canCreate: Boolean(permission.canCreate),

        canUpdate: Boolean(permission.canUpdate),

        canDelete: Boolean(permission.canDelete),
      });
    }

    // =====================================================
    // 10. Update Role
    // =====================================================

    role.name = name.trim();

    role.description = description?.trim() || "";

    role.permissions = uniquePermissions;

    // =====================================================
    // 11. Audit Information
    // =====================================================

    role.updatedBy = {
      userId: author._id,
      name: author.name,
      email: author.email,
    };

    // =====================================================
    // 12. Save
    // =====================================================

    await role.save();

    // =====================================================
    // 13. Success Response
    // =====================================================

    return res.status(200).json({
      success: true,
      code: "ROLE_UPDATED",
      message: "Role updated successfully",
      data: role,
    });
  } catch (error) {
    console.error("Update role error:", error);

    // MongoDB duplicate key
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        code: "ROLE_NAME_ALREADY_EXISTS",
        message: "A role with this name already exists",
      });
    }

    return res.status(500).json({
      success: false,
      code: "ROLE_UPDATE_FAILED",
      message: "Failed to update role",
    });
  }
};

module.exports = {
  updateRole,
};
