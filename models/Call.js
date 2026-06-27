import mongoose from 'mongoose'

const callSchema = new mongoose.Schema({
  initiator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  type: { type: String, enum: ['voice', 'video'], required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  status: { type: String, enum: ['ringing', 'ongoing', 'ended', 'missed', 'rejected'], default: 'ringing' },
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number, default: 0 },
  endedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

callSchema.index({ initiator: 1, createdAt: -1 })
callSchema.index({ participants: 1 })

export default mongoose.model('Call', callSchema)