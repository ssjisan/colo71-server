const mongoose = require("mongoose");

const visitSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "facility-visit",
      unique: true,
      required: true,
    },

    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
    },

    startTime: {
      type: String,
      default: "09:00",
    },

    endTime: {
      type: String,
      default: "17:00",
    },

    slotDurationMinutes: {
      type: Number,
      default: 30,
      min: 5,
      max: 240,
    },

    // Maximum requests accepted for each individual time slot.
    capacityPerSlot: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
    },

    // Maximum requests accepted across all slots on one day.
    maxRequestsPerDay: {
      type: Number,
      default: 10,
      min: 1,
      max: 500,
    },

    blockedDates: {
      type: [String],
      default: [],
    },
    notificationEmails: {
      type: [String],
      default: [],
      validate: {
        validator: (emails) =>
          emails.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
        message: "Please provide valid notification email addresses.",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("VisitSettings", visitSettingsSchema);
