import mongoose from 'mongoose'

const channelMessageSchema = new mongoose.Schema({
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', 'audio', 'file', ''], default: '' },
  fileName: { type: String, default: '' },
  reactions: [{
    emoji: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

channelMessageSchema.index({ channelId: 1, createdAt: -1 })

export default mongoose.model('ChannelMessage', channelMessageSchema)