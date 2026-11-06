
const mongoose = require("mongoose");
const crypto = require("crypto");

const contactEnquirySchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    company: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "",
    },

    enquiryType: {
      id: {
        type: String,
        required: true,
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    // Enquiry reading status
    status: {
      type: String,
      enum: ["new", "viewed"],
      default: "new",
      index: true,
    },

    // Archive management
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },

    archivedAt: {
      type: Date,
      default: null,
    },

    source: {
      page: {
        type: String,
        default: "/contact",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate a reference ID automatically
contactEnquirySchema.pre("validate", function () {
  if (!this.referenceId) {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();

    this.referenceId = `ENQ-${date}-${random}`;
  }
});

// List and filtering indexes
contactEnquirySchema.index({
  isArchived: 1,
  createdAt: -1,
});

contactEnquirySchema.index({
  "enquiryType.id": 1,
  isArchived: 1,
  createdAt: -1,
});

contactEnquirySchema.index({
  email: 1,
  createdAt: -1,
});

module.exports = mongoose.model("ContactEnquiry", contactEnquirySchema);
