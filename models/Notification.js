import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['message', 'friend_request', 'friend_accepted', 'mention', 'call', 'community_invite', 'system', 'trust_update'],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  isRead: { type: Boolean, default: false },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })

export default mongoose.model('Notification', notificationSchema)