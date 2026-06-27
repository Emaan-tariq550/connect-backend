import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'admin', 'moderator', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
}, { _id: false })

const communitySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: '', maxlength: 500 },
  banner: { type: String, default: '' },
  icon: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [memberSchema],
  memberCount: { type: Number, default: 1 },
  isPrivate: { type: Boolean, default: false },
  inviteCode: { type: String, unique: true, sparse: true },
  tags: [{ type: String }],
  isVerified: { type: Boolean, default: false },
}, { timestamps: true })

communitySchema.index({ name: 'text', description: 'text' })
communitySchema.index({ owner: 1 })
communitySchema.index({ 'members.user': 1 })

export default mongoose.model('Community', communitySchema)