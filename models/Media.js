import mongoose from 'mongoose'

const mediaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ['image', 'video'], required: true },
  publicId: { type: String, default: '' }, // cloudinary public_id for deletion
}, { timestamps: true })

mediaSchema.index({ user: 1, createdAt: -1 })

export default mongoose.model('Media', mediaSchema)