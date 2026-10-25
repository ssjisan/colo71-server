const mongoose = require("mongoose");

const visitRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    organization: { type: String, trim: true, maxlength: 160, default: "" },
    purpose: { type: String, required: true, trim: true, maxlength: 1000 },
    visitDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    visitTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    status: {
      type: String,
      enum: ["Pending", "Cancelled", "Completed", "Rejected"],
      default: "Pending",
      required: true,
    },

    statusHistory: [
      {
        previousStatus: {
          type: String,
          enum: ["Pending", "Cancelled", "Completed", "Rejected"],
          default: null,
        },

        newStatus: {
          type: String,
          enum: ["Pending", "Approved", "Cancelled", "Completed", "Rejected"],
          required: true,
        },

        remark: {
          type: String,
          required: true,
          trim: true,
          maxlength: 1000,
        },

        changedAt: {
          type: Date,
          default: Date.now,
        },

        // We'll populate this from the authenticated admin in the controller.
        changedBy: {
          type: String,
          default: "",
        },
      },
    ],
  },
  { timestamps: true },
);

visitRequestSchema.index({ visitDate: 1, visitTime: 1 });
visitRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("VisitRequest", visitRequestSchema);
