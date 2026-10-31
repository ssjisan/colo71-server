const express = require("express");
const router = express.Router();

const publicVisitController = require("../controller/facilityVisit/publicVisit.controller");
const adminSettingsController = require("../controller/facilityVisit/adminSettings.controller");
const adminRequestsController = require("../controller/facilityVisit/adminRequests.controller");

const {
  generalApiLimiter,
  availabilityLimiter,
  visitRequestLimiter,
} = require("../middlewares/rateLimits");

const { requiredSignIn } = require("../middlewares/authMiddleware");
const { checkPermission } = require("../middlewares/checkPermission");

router.use(generalApiLimiter);

// ==========================================
// PUBLIC FACILITY VISIT ENDPOINTS
// ==========================================

router.get(
  "/facility-visits/settings",
  publicVisitController.getPublicSettings,
);

router.get(
  "/facility-visits/availability",
  availabilityLimiter,
  publicVisitController.getAvailability,
);

router.post(
  "/facility-visits/request",
  visitRequestLimiter,
  publicVisitController.createVisitRequest,
);

// ==========================================
// ADMIN SCHEDULER SETTINGS
// ==========================================

router.get(
  "/facility-visits/admin/settings",
  requiredSignIn,
  checkPermission("schedule-management", "canView"),
  adminSettingsController.getAdminSettings,
);

router.patch(
  "/facility-visits/admin/settings",
  requiredSignIn,
  checkPermission("schedule-management", "canUpdate"),
  adminSettingsController.updateAdminSettings,
);

// ==========================================
// ADMIN VISIT REQUESTS
// ==========================================

router.get(
  "/facility-visits/admin/requests",
  requiredSignIn,
  checkPermission("requested-schedule", "canView"),
  adminRequestsController.getAdminRequests,
);

router.get(
  "/facility-visits/admin/upcoming",
  requiredSignIn,
  checkPermission("requested-schedule", "canView"),
  adminRequestsController.getUpcomingRequests,
);

router.get(
  "/facility-visits/admin/archive",
  requiredSignIn,
  checkPermission("requested-schedule", "canView"),
  adminRequestsController.getArchiveRequests,
);

router.patch(
  "/facility-visits/admin/requests/:id/status",
  requiredSignIn,
  checkPermission("requested-schedule", "canView"),
  adminRequestsController.updateRequestStatus,
);

module.exports = router;
