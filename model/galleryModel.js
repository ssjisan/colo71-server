const mongoose = require("mongoose");

const galleryImageSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    path: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: Number,
      required: true,
      min: 1,
      max: 2 * 1024 * 1024,
    },

    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: true,
  },
);

const galleryAlbumSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    thumbnail: {
      filename: {
        type: String,
        required: true,
        trim: true,
      },

      originalName: {
        type: String,
        required: true,
        trim: true,
      },

      path: {
        type: String,
        required: true,
        trim: true,
      },

      mimeType: {
        type: String,
        required: true,
        trim: true,
      },

      size: {
        type: Number,
        required: true,
        min: 1,
        max: 2 * 1024 * 1024,
      },
    },

    images: {
      type: [galleryImageSchema],
      default: [],
      validate: {
        validator: function (images) {
          return images.length <= 50;
        },
        message: "An album cannot contain more than 50 images.",
      },
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("GalleryAlbum", galleryAlbumSchema);
