import Post from '../models/Post.js'
import { upload } from '../config/cloudinary.js'

// GET /posts/user/:username — profile ke posts
export const getUserPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({
      author: req.profileUser._id,
      community: null,
    })
      .sort({ createdAt: -1 })
      .populate('author', 'fullName username avatar')
      .limit(20)

    res.json({ success: true, posts })
  } catch (err) { next(err) }
}

// POST /posts — profile pe post karo
export const createPost = async (req, res, next) => {
  try {
    const { content } = req.body

    if (!content?.trim() && !req.file) {
      return res.status(400).json({ success: false, message: 'Post cannot be empty' })
    }

    const postData = {
      author: req.user._id,
      content: content?.trim() || '',
      community: null,
    }

    if (req.file) {
      postData.fileUrl = req.file.path
      postData.fileType = req.file.mimetype
    }

    const post = await Post.create(postData)
    await post.populate('author', 'fullName username avatar')

    res.status(201).json({ success: true, post })
  } catch (err) { next(err) }
}