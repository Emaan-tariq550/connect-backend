import mongoose from 'mongoose'

const friendRequestSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'cancelled'], default: 'pending' },
}, { timestamps: true })

friendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true })
friendRequestSchema.index({ receiver: 1, status: 1 })

export default mongoose.model('FriendRequest', friendRequestSchema)