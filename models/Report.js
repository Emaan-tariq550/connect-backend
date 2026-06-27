import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['spam', 'harassment', 'scam', 'inappropriate', 'fake', 'other'], required: true },
  message: { type: String, default: '' },
  messageRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
}, { timestamps: true })

reportSchema.index({ status: 1, createdAt: -1 })
reportSchema.index({ reportedUser: 1 })

export default mongoose.model('Report', reportSchema)