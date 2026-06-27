import mongoose from 'mongoose'

const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String, default: '' },
  groupAvatar: { type: String, default: '' },
  groupDescription: { type: String, default: '' },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  unreadCounts: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 },
  }],
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  isArchived: { type: Boolean, default: false },
}, { timestamps: true })

chatSchema.index({ participants: 1 })
chatSchema.index({ updatedAt: -1 })

export default mongoose.model('Chat', chatSchema)