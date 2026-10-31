const Blog = require('../../model/blogModel');
module.exports = async function getFeaturedBlogs(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const blogs = await Blog.find({ published: true, featured: true })
      .select('-contentJSON -contentHTML')
      .sort({ publishedAt: -1, createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data: blogs });
  } catch (error) { next(error); }
};
