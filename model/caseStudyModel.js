const mongoose = require("mongoose");

const caseStudySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Case study title is required."],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    storageKey: { type: String, trim: true, index: true },
    summary: { type: String, trim: true, maxlength: 500, default: "" },

    clientName: { type: String, trim: true, maxlength: 200, default: "" },
    industry: { type: String, trim: true, required: true, maxlength: 100 },
    projectLocation: { type: String, trim: true, maxlength: 200, default: "" },
    completionDate: { type: Date, default: null },
    projectType: { type: String, trim: true, required: true, maxlength: 120 },

    contentJSON: { type: mongoose.Schema.Types.Mixed, required: true },
    contentHTML: { type: String, required: true },
    coverPhoto: { type: String, default: null },

    featured: { type: Boolean, default: false, index: true },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

caseStudySchema.index({ published: 1, featured: 1, publishedAt: -1 });
caseStudySchema.index({ published: 1, publishedAt: -1 });

module.exports =
  mongoose.models.CaseStudy ||
  mongoose.model("CaseStudy", caseStudySchema);
