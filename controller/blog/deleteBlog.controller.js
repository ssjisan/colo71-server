const Blog = require('../../model/blogModel');
const { removeBlogFiles } = require('../../utils/blogFiles');
module.exports = async function deleteBlog(req, res, next) {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: 'Blog not found.' });
    await blog.deleteOne();
    await removeBlogFiles(blog);
    return res.json({ success: true, message: 'Blog deleted successfully.' });
  } catch (error) { next(error); }
};
