import ChannelMessage from '../models/ChannelMessage.js'

export const registerCommunitySocket = (io, socket) => {
  const userId = socket.user._id.toString()

  socket.on('join_channel', (channelId) => {
    socket.join(`channel_${channelId}`)
  })

  socket.on('leave_channel', (channelId) => {
    socket.leave(`channel_${channelId}`)
  })

  socket.on('channel_typing', ({ channelId, isTyping }) => {
    socket.to(`channel_${channelId}`).emit('channel_typing', {
      userId,
      name: socket.user.fullName,
      isTyping,
    })
  })

  socket.on('channel_react', async ({ msgId, emoji, channelId }) => {
    try {
      const msg = await ChannelMessage.findById(msgId)
      if (!msg) return
      const existingIdx = msg.reactions.findIndex(r => r.user.toString() === userId && r.emoji === emoji)
      if (existingIdx > -1) msg.reactions.splice(existingIdx, 1)
      else msg.reactions.push({ emoji, user: userId })
      await msg.save()
      io.to(`channel_${channelId}`).emit('channel_reaction', { msgId, reactions: msg.reactions })
    } catch (err) {
      console.error('[Socket] channel_react error:', err.message)
    }
  })

  socket.on('channel_delete_message', async ({ msgId, channelId }) => {
    try {
      const msg = await ChannelMessage.findOne({ _id: msgId, sender: userId })
      if (!msg) return
      msg.deleted = true; msg.text = ''
      await msg.save()
      io.to(`channel_${channelId}`).emit('channel_message_deleted', { msgId, channelId })
    } catch (err) {
      console.error('[Socket] channel_delete error:', err.message)
    }
  })
}