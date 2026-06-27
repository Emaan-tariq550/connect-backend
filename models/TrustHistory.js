import mongoose from 'mongoose'

const trustHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: String, required: true },
  label: { type: String, required: true },
  points: { type: Number, required: true },
  oldScore: { type: Number },
  newScore: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

trustHistorySchema.index({ user: 1, createdAt: -1 })

export default mongoose.model('TrustHistory', trustHistorySchema)