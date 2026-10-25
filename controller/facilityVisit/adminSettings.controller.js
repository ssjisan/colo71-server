const VisitSettings = require("../../model/VisitSettings");
const {
  TIME_RE,
  isValidDateString,
  timeToMinutes,
  getOrCreateSettings,
} = require("./shared");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

exports.getAdminSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    return res.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get admin visit settings failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load scheduler settings.",
    });
  }
};

exports.updateAdminSettings = async (req, res) => {
  try {
    const allowedFields = [
      "workingDays",
      "startTime",
      "endTime",
      "slotDurationMinutes",
      "capacityPerSlot",
      "maxRequestsPerDay",
      "blockedDates",
      "timezone",
      "notificationEmails",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one supported setting to update.",
      });
    }

    const current = await getOrCreateSettings();
    const candidate = {
      ...current.toObject(),
      ...updates,
    };

    // Validate working days
    if (
      !Array.isArray(candidate.workingDays) ||
      !candidate.workingDays.every(
        (day) => Number.isInteger(day) && day >= 0 && day <= 6,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "workingDays must be an array of weekday numbers from 0 to 6.",
      });
    }

    // Validate working hours
    if (
      typeof candidate.startTime !== "string" ||
      typeof candidate.endTime !== "string" ||
      !TIME_RE.test(candidate.startTime) ||
      !TIME_RE.test(candidate.endTime) ||
      timeToMinutes(candidate.endTime) <= timeToMinutes(candidate.startTime)
    ) {
      return res.status(400).json({
        success: false,
        message: "End time must be later than start time. Use HH:mm format.",
      });
    }

    // Validate slot duration
    if (
      !Number.isInteger(candidate.slotDurationMinutes) ||
      candidate.slotDurationMinutes < 5 ||
      candidate.slotDurationMinutes > 240
    ) {
      return res.status(400).json({
        success: false,
        message: "slotDurationMinutes must be an integer from 5 to 240.",
      });
    }

    // Validate slot capacity
    if (
      !Number.isInteger(candidate.capacityPerSlot) ||
      candidate.capacityPerSlot < 1 ||
      candidate.capacityPerSlot > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "capacityPerSlot must be an integer from 1 to 100.",
      });
    }

    // Validate maximum daily requests
    if (
      !Number.isInteger(candidate.maxRequestsPerDay) ||
      candidate.maxRequestsPerDay < 1 ||
      candidate.maxRequestsPerDay > 500
    ) {
      return res.status(400).json({
        success: false,
        message: "maxRequestsPerDay must be an integer from 1 to 500.",
      });
    }

    // Validate blocked dates
    if (
      !Array.isArray(candidate.blockedDates) ||
      !candidate.blockedDates.every(isValidDateString)
    ) {
      return res.status(400).json({
        success: false,
        message: "blockedDates must be an array of dates in YYYY-MM-DD format.",
      });
    }

    // Validate timezone
    if (
      typeof candidate.timezone !== "string" ||
      !candidate.timezone.trim() ||
      candidate.timezone.length > 80
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid timezone string.",
      });
    }

    // Validate and normalize notification email group
    if (
      !Array.isArray(candidate.notificationEmails) ||
      !candidate.notificationEmails.every(
        (email) => typeof email === "string" && isValidEmail(email.trim()),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "notificationEmails must be an array of valid email addresses.",
      });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "notificationEmails")) {
      updates.notificationEmails = [
        ...new Set(
          candidate.notificationEmails.map((email) =>
            email.trim().toLowerCase(),
          ),
        ),
      ];
    }

    const settings = await VisitSettings.findOneAndUpdate(
      { key: "facility-visit" },
      { $set: updates },
      {
        new: true,
        runValidators: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.json({
      success: true,
      message: "Scheduler settings updated.",
      settings,
    });
  } catch (error) {
    console.error("Update admin visit settings failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update scheduler settings.",
    });
  }
};
