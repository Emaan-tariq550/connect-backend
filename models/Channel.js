import mongoose from 'mongoose'

const channelSchema = new mongoose.Schema({
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  name: { type: String, required: true, trim: true, maxlength: 40 },
  description: { type: String, default: '', maxlength: 200 },
  type: { type: String, enum: ['text', 'voice', 'announcement'], default: 'text' },
  category: { type: String, default: 'General' },
  isPrivate: { type: Boolean, default: false },
  allowedRoles: [{ type: String }],
  pinnedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ChannelMessage' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'ChannelMessage' },
  slowMode: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true })

channelSchema.index({ community: 1 })

export default mongoose.model('Channel', channelSchema)