import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 60 },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9_]{3,20}$/
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true, minlength: 8, select: false },
  avatar: { type: String, default: '' },
  coverPhoto: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 300 },
  statusMessage: { type: String, default: '', maxlength: 100 },
  skills: [{ type: String }],
  socialLinks: {
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    website: { type: String, default: '' },
  },

  // Auth
  isEmailVerified: { type: Boolean, default: false },
  emailOTP: { type: String, select: false },
  emailOTPExpiry: { type: Date, select: false },
  passwordResetOTP: { type: String, select: false },
  passwordResetOTPExpiry: { type: Date, select: false },
  refreshTokens: [{ type: String, select: false }],

  // Status
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  socketId: { type: String, default: '' },

  // Privacy
  privacySettings: {
    messagingPermission: { type: String, enum: ['everyone', 'friends', 'none'], default: 'everyone' },
    profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    showLastSeen: { type: Boolean, default: true },
  },

  // Trust & Reputation
  trustScore: { type: Number, default: 0, min: 0, max: 100 },
  trustLevel: { type: String, enum: ['Trusted', 'Reliable', 'Average', 'Suspicious'], default: 'Average' },
  badges: [{ type: String }],
  messageCount: { type: Number, default: 0 },
  completedCalls: { type: Number, default: 0 },
  positiveRatings: { type: Number, default: 0 },
  communityScore: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  trustFactors: {
    emailVerified: { type: Boolean, default: false },
    profileComplete: { type: Boolean, default: false },
    activityScore: { type: Number, default: 0 },
    feedbackScore: { type: Number, default: 0 },
    callScore: { type: Number, default: 0 },
    reportPenalty: { type: Number, default: 0 },
  },

  // Admin
  isAdmin: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },

  // Friends & Requests
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  receivedRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, { timestamps: true })

// Indexes
userSchema.index({ trustScore: -1 })
userSchema.index({ isOnline: 1 })
userSchema.index({ fullName: 'text', username: 'text' })

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password)
}

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshTokens
  delete obj.emailOTP
  delete obj.emailOTPExpiry
  delete obj.passwordResetOTP
  delete obj.passwordResetOTPExpiry
  delete obj.blockedUsers
  return obj
}

export default mongoose.model('User', userSchema)