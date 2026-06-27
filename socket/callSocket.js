import Call from '../models/Call.js'
import { updateTrustScore } from '../utils/trustEngine.js'

export const registerCallSocket = (io, socket) => {
  const userId = socket.user._id.toString()

  socket.on('initiate_call', async ({ toUserId, type, chatId }) => {
    try {
      const call = await Call.create({
        initiator: userId,
        participants: [userId, toUserId],
        type,
        chatId,
        status: 'ringing',
      })
      await call.populate('initiator', 'fullName username avatar trustScore trustLevel')

      io.to(`user_${toUserId}`).emit('incoming_call', {
        _id: call._id,
        type,
        caller: call.initiator,
        participants: call.participants,
        initiator: userId,
      })

      socket.emit('call_initiated', { callId: call._id })
    } catch (err) {
      console.error('[Socket] initiate_call error:', err.message)
    }
  })

  socket.on('accept_call', async ({ callId }) => {
    try {
      const call = await Call.findByIdAndUpdate(callId, { status: 'ongoing', startedAt: new Date() }, { new: true })
      if (!call) return
      call.participants.forEach(pId => {
        io.to(`user_${pId.toString()}`).emit('call_accepted', { callId, by: userId })
      })
    } catch (err) {
      console.error('[Socket] accept_call error:', err.message)
    }
  })

  socket.on('reject_call', async ({ callId }) => {
    try {
      const call = await Call.findByIdAndUpdate(callId, { status: 'rejected' }, { new: true })
      if (!call) return
      io.to(`user_${call.initiator.toString()}`).emit('call_rejected', { callId })
    } catch (err) {
      console.error('[Socket] reject_call error:', err.message)
    }
  })

  socket.on('end_call', async ({ callId }) => {
    try {
      const call = await Call.findById(callId)
      if (!call || call.status === 'ended') return

      const duration = call.startedAt ? Math.floor((Date.now() - call.startedAt) / 1000) : 0
      await Call.findByIdAndUpdate(callId, { status: 'ended', endedAt: new Date(), endedBy: userId, duration })

      call.participants.forEach(pId => {
        io.to(`user_${pId.toString()}`).emit('call_ended', { callId, duration })
      })

      if (duration > 10) {
        for (const pId of call.participants) {
          await updateTrustScore(pId.toString(), 'CALL_COMPLETED', { callId, duration })
        }
      }
    } catch (err) {
      console.error('[Socket] end_call error:', err.message)
    }
  })

  socket.on('raise_hand', ({ callId, raised }) => {
    socket.broadcast.emit('hand_raised', { callId, userId, raised })
  })

  // WebRTC signaling
  socket.on('webrtc_offer', ({ to, offer, callId }) => {
    io.to(`user_${to}`).emit('webrtc_offer', { from: userId, offer, callId })
  })

  socket.on('webrtc_answer', ({ to, answer, callId }) => {
    io.to(`user_${to}`).emit('webrtc_answer', { from: userId, answer, callId })
  })

  socket.on('webrtc_ice', ({ to, candidate, callId }) => {
    io.to(`user_${to}`).emit('webrtc_ice', { from: userId, candidate, callId })
  })
}