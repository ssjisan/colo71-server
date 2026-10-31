const mongoose = require('mongoose');
const blogSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Blog title is required.'], trim: true, maxlength: 200 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  // Stable folder name for assets. It does not change when the title/slug is edited.
  storageKey: { type: String, trim: true, index: true },
  excerpt: { type: String, trim: true, maxlength: 500, default: '' },
  contentJSON: { type: mongoose.Schema.Types.Mixed, required: true },
  contentHTML: { type: String, required: true },
  coverPhoto: { type: String, default: null },
  featured: { type: Boolean, default: false, index: true },
  published: { type: Boolean, default: false, index: true },
  publishedAt: { type: Date, default: null },
}, { timestamps: true });
blogSchema.index({ published: 1, featured: 1, publishedAt: -1 });
blogSchema.index({ published: 1, publishedAt: -1 });
module.exports = mongoose.models.Blog || mongoose.model('Blog', blogSchema);
