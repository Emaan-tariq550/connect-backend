import mongoose from 'mongoose'

const postSchema = new mongoose.Schema({
  // community post ke liye (optional)
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
  // profile post ke liye
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxlength: 2000, default: '' },
  fileUrl: { type: String, default: '' },
  fileType: { type: String, default: '' },
  images: [{ type: String }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likesCount: { type: Number, default: 0 },
}, { timestamps: true })

postSchema.index({ author: 1, createdAt: -1 })
postSchema.index({ community: 1, createdAt: -1 })

export default mongoose.model('Post', postSchema)