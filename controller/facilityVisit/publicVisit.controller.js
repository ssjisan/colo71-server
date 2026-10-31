const VisitRequest = require("../../model/VisitRequest");
const { sendEmail } = require("../../helper/sendEmail");
const {
  visitorAcknowledgementTemplate,
  adminVisitNotificationTemplate,
} = require("../../helper/emailTemplates/facilityVisitEmail.template");

const {
  TIME_RE,
  isValidDateString,
  getOrCreateSettings,
  getSlotsForDate,
  isWithinBookingWindow,
} = require("./shared");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Public scheduler settings
exports.getPublicSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    return res.json({
      success: true,
      settings: {
        workingDays: settings.workingDays,
        startTime: settings.startTime,
        endTime: settings.endTime,
        slotDurationMinutes: settings.slotDurationMinutes,
        timezone: settings.timezone,
      },
    });
  } catch (error) {
    console.error("Get public visit settings failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load visit settings.",
    });
  }
};

// Get available time slots for a date
exports.getAvailability = async (req, res) => {
  try {
    const { date } = req.query;

    if (!isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format.",
      });
    }

    if (!isWithinBookingWindow(date)) {
      return res.status(400).json({
        success: false,
        message:
          "Visits can only be requested from today through the next 20 days.",
      });
    }

    const settings = await getOrCreateSettings();
    const slots = getSlotsForDate(date, settings);

    if (!slots.length) {
      return res.json({
        success: true,
        date,
        slots: [],
      });
    }

    const counts = await VisitRequest.aggregate([
      {
        $match: {
          visitDate: date,
          visitTime: { $in: slots },
          status: { $nin: ["Cancelled", "Rejected"] },
        },
      },
      {
        $group: {
          _id: "$visitTime",
          count: { $sum: 1 },
        },
      },
    ]);

    const countByTime = new Map(counts.map((item) => [item._id, item.count]));

    return res.json({
      success: true,
      date,
      slots: slots.map((time) => ({
        time,
        available: (countByTime.get(time) || 0) < settings.capacityPerSlot,
      })),
    });
  } catch (error) {
    console.error("Get visit availability failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load visit availability.",
    });
  }
};

// Create a public facility visit request
exports.createVisitRequest = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      organization = "",
      purpose,
      visitDate,
      visitTime,
    } = req.body || {};

    // Required fields
    if (
      ![name, email, phone, purpose, visitDate, visitTime].every(
        (value) => typeof value === "string" && value.trim(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, phone, purpose, visit date and visit time are required.",
      });
    }

    // Field length validation
    if (
      name.trim().length > 120 ||
      email.trim().length > 254 ||
      phone.trim().length > 40 ||
      typeof organization !== "string" ||
      organization.trim().length > 160 ||
      purpose.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more fields exceed the allowed length.",
      });
    }

    // Email validation
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid email address.",
      });
    }

    // Date and time validation
    if (!isValidDateString(visitDate) || !TIME_RE.test(visitTime)) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid visit date and time.",
      });
    }

    if (!isWithinBookingWindow(visitDate)) {
      return res.status(400).json({
        success: false,
        message:
          "Visits can only be requested from today through the next 20 days.",
      });
    }

    // Load scheduler settings
    const settings = await getOrCreateSettings();

    // Validate selected slot
    const slots = getSlotsForDate(visitDate, settings);

    if (!slots.includes(visitTime)) {
      return res.status(400).json({
        success: false,
        message: "That date or time is not available for visits.",
      });
    }

    // Check slot capacity
    const count = await VisitRequest.countDocuments({
      visitDate,
      visitTime,
      status: { $nin: ["Cancelled", "Rejected"] },
    });

    if (count >= settings.capacityPerSlot) {
      return res.status(409).json({
        success: false,
        message: "That time slot is full. Please choose another time.",
      });
    }

    // Save the request before attempting to send emails
    const request = await VisitRequest.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      organization: organization.trim(),
      purpose: purpose.trim(),
      visitDate,
      visitTime,
    });

    // Prepare the visitor acknowledgement email
    const visitorEmail = visitorAcknowledgementTemplate(request);

    // Read recipients from admin scheduler settings
    const adminEmails = [
      ...new Set(
        (Array.isArray(settings.notificationEmails)
          ? settings.notificationEmails
          : []
        )
          .filter(
            (recipient) =>
              typeof recipient === "string" && isValidEmail(recipient.trim()),
          )
          .map((recipient) => recipient.trim().toLowerCase()),
      ),
    ];

    // Send the visitor email and all configured admin notifications
    const emailTasks = [
      {
        label: "Visitor acknowledgement",
        recipient: request.email,
        promise: sendEmail({
          to: request.email,
          ...visitorEmail,
        }),
      },
    ];

    if (adminEmails.length > 0) {
      const adminEmail = adminVisitNotificationTemplate(request);

      adminEmails.forEach((recipient) => {
        emailTasks.push({
          label: "Admin notification",
          recipient,
          promise: sendEmail({
            to: recipient,
            ...adminEmail,
          }),
        });
      });
    } else {
      console.warn(
        "No valid facility visit notification emails are configured.",
      );
    }

    const emailResults = await Promise.allSettled(
      emailTasks.map((task) => task.promise),
    );

    emailResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `${emailTasks[index].label} failed for ${emailTasks[index].recipient}:`,
          result.reason,
        );
      }
    });

    // Request remains successful even if email delivery fails
    return res.status(201).json({
      success: true,
      message:
        "Your visit request has been received. We will send you a confirmation after reviewing it.",
      request: {
        id: request._id,
        visitDate: request.visitDate,
        visitTime: request.visitTime,
      },
    });
  } catch (error) {
    console.error("Create visit request failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit your visit request.",
    });
  }
};
