const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^\S+@\S+\.\S+$/,
    },
    otp: {
      type: String,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
    },
    otpRequestedAt: {
      type: Date,
      default: null,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },

    passwordResetExpires: {
      type: Date,
      default: null,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },

    passwordHistory: [
      {
        type: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
    },
    lastLogin: {
      type: Date,
    },
    passwordResetVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", UserSchema);
