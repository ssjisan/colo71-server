
const mongoose = require("mongoose");

const enquiryTypeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    order: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

const contactFormConfigSchema = new mongoose.Schema(
  {
    enquiryType: {
      type: [enquiryTypeSchema],
      default: [],
    },

    mailGroup: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
      ],
      default: [],
      validate: {
        validator: (emails) =>
          emails.length === new Set(emails).size,
        message: "Duplicate email addresses are not allowed.",
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.ContactFormConfig ||
  mongoose.model("ContactFormConfig", contactFormConfigSchema);
