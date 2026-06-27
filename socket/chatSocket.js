import Message from '../models/Message.js'
import Chat from '../models/Chat.js'

export const registerChatSocket = (io, socket) => {
  const userId = socket.user._id.toString()

  socket.on('join_chat', (chatId) => {
    socket.join(chatId)
  })

  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId)
  })

  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(chatId).emit('typing', {
      userId,
      name: socket.user.fullName,
      isTyping,
      chatId,
    })
  })

  socket.on('mark_read', async ({ chatId }) => {
    try {
      await Chat.findOneAndUpdate(
        { _id: chatId, 'unreadCounts.user': userId },
        { $set: { 'unreadCounts.$.count': 0 } }
      )
      await Message.updateMany(
        { chatId, 'readBy.userId': { $ne: userId } },
        { $push: { readBy: { userId, readAt: new Date() } } }
      )
      socket.to(chatId).emit('read_receipt', { chatId, userId, readAt: new Date() })
    } catch (err) {
      console.error('[Socket] mark_read error:', err.message)
    }
  })

  socket.on('react_message', async ({ msgId, emoji, chatId }) => {
    try {
      const msg = await Message.findById(msgId)
      if (!msg) return
      const existingIdx = msg.reactions.findIndex(r => r.user.toString() === userId && r.emoji === emoji)
      if (existingIdx > -1) msg.reactions.splice(existingIdx, 1)
      else msg.reactions.push({ emoji, user: userId })
      await msg.save()
      io.to(chatId).emit('message_reaction', { msgId, reactions: msg.reactions, chatId })
    } catch (err) {
      console.error('[Socket] react error:', err.message)
    }
  })

  socket.on('delete_message', async ({ msgId, chatId }) => {
    try {
      const msg = await Message.findOne({ _id: msgId, sender: userId })
      if (!msg) return
      msg.deleted = true; msg.text = ''; msg.mediaUrl = ''
      await msg.save()
      io.to(chatId).emit('message_deleted', { msgId, chatId })
    } catch (err) {
      console.error('[Socket] delete error:', err.message)
    }
  })

  socket.on('edit_message', async ({ msgId, text, chatId }) => {
    try {
      const msg = await Message.findOne({ _id: msgId, sender: userId })
      if (!msg || msg.deleted) return
      msg.text = text.trim(); msg.edited = true
      await msg.save()
      io.to(chatId).emit('message_edited', { msgId, text: msg.text, chatId })
    } catch (err) {
      console.error('[Socket] edit error:', err.message)
    }
  })
}