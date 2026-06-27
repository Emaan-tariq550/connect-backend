import mongoose from 'mongoose'

const reactionSchema = new mongoose.Schema({
  emoji: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: false })

const readBySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  readAt: { type: Date, default: Date.now },
}, { _id: false })

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', 'audio', 'file', ''], default: '' },
  fileName: { type: String, default: '' },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  reactions: [reactionSchema],
  readBy: [readBySchema],
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  starred: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
}, { timestamps: true })

messageSchema.index({ chatId: 1, createdAt: -1 })
messageSchema.index({ sender: 1 })

export default mongoose.model('Message', messageSchema)