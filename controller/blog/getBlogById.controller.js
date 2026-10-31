const mongoose = require('mongoose');
const Blog = require('../../model/blogModel');
// Admin/editor endpoint: returns a blog by MongoDB _id, including unpublished drafts.
module.exports = async function getBlogById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid blog ID.' });
    }
    const blog = await Blog.findById(id).lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    return res.json({ success: true, data: blog });
  } catch (error) { next(error); }
};
