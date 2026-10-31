const Blog = require('../../model/blogModel');

// Public: returns published posts only. Supports ?page=1&limit=10&featured=true
module.exports = async function getBlogs(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const filter = { published: true };
    if (req.query.featured === 'true') filter.featured = true;
    const [blogs, total] = await Promise.all([
      Blog.find(filter).select('-contentJSON -contentHTML')
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Blog.countDocuments(filter),
    ]);
    return res.json({
      success: true, data: blogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) { next(error); }
};
