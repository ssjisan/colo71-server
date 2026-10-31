const Blog = require('../../model/blogModel');
// Public single-post endpoint by slug. Drafts are never exposed here.
module.exports = async function getBlog(req, res, next) {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, published: true }).lean();
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    return res.json({ success: true, data: blog });
  } catch (error) { next(error); }
};
