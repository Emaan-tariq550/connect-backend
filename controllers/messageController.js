import Message from '../models/Message.js'
import Chat from '../models/Chat.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import { getIO } from '../socket/socketManager.js'
import { updateTrustScore } from '../utils/trustEngine.js'

export const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 30

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id })
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' })

    const total = await Message.countDocuments({ chatId })
    const messages = await Message.find({ chatId })
      .populate('sender', 'fullName username avatar trustScore trustLevel')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'fullName' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.json({
      success: true,
      messages: messages.reverse(),
      hasMore: page * limit < total,
      total,
    })
  } catch (err) { next(err) }
}

export const sendMessage = async (req, res, next) => {
  try {
    const { chatId, text, replyTo } = req.body

    const mediaUrl = req.file?.path || req.body.mediaUrl || ''
    const mediaType = req.file
      ? req.file.mimetype.startsWith('image/') ? 'image'
        : req.file.mimetype.startsWith('video/') ? 'video'
        : req.file.mimetype.startsWith('audio/') ? 'audio'
        : 'file'
      : req.body.mediaType || ''
    const fileName = req.file?.originalname || req.body.fileName || ''

    if (!chatId) return res.status(400).json({ success: false, message: 'chatId required' })
    if (!text?.trim() && !mediaUrl) return res.status(400).json({ success: false, message: 'Message cannot be empty' })

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id })
    if (!chat) return res.status(403).json({ success: false, message: 'Access denied' })

    const message = await Message.create({
      chatId,
      sender: req.user._id,
      text: text?.trim() || '',
      mediaUrl,
      mediaType,
      fileName,
      replyTo: replyTo || null,
      status: 'sent',
    })

    await message.populate('sender', 'fullName username avatar trustScore trustLevel')
    if (message.replyTo) {
      await message.populate({ path: 'replyTo', populate: { path: 'sender', select: 'fullName' } })
    }

    const otherParticipants = chat.participants.filter(
      p => p.toString() !== req.user._id.toString()
    )

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    })

    for (const participantId of otherParticipants) {
      await Chat.findOneAndUpdate(
        { _id: chatId, 'unreadCounts.user': participantId },
        { $inc: { 'unreadCounts.$.count': 1 } },
        { upsert: false }
      )
      await Notification.create({
        recipient: participantId,
        type: 'message',
        title: req.user.fullName,
        body: text?.trim() || '📎 Media',
        actor: req.user._id,
        data: { chatId, messageId: message._id },
      })
    }

    await User.findByIdAndUpdate(req.user._id, { $inc: { messageCount: 1 } })
    if (req.user.messageCount % 100 === 0) {
      await updateTrustScore(req.user._id, 'MESSAGE_SENT', { count: req.user.messageCount })
    }

    const io = getIO()
    io?.to(chatId).emit('new_message', message)
    for (const pId of otherParticipants) {
      io?.to(`user_${pId}`).emit('chat_updated', { chatId, lastMessage: message })
    }

    res.status(201).json({ success: true, message })
  } catch (err) { next(err) }
}

export const editMessage = async (req, res, next) => {
  try {
    const { text } = req.body
    const msg = await Message.findOne({ _id: req.params.msgId, sender: req.user._id })
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' })
    if (msg.deleted) return res.status(400).json({ success: false, message: 'Cannot edit deleted message' })

    msg.text = text.trim()
    msg.edited = true
    await msg.save()

    const io = getIO()
    io?.to(msg.chatId.toString()).emit('message_edited', { msgId: msg._id, text: msg.text, chatId: msg.chatId })

    res.json({ success: true, message: msg })
  } catch (err) { next(err) }
}

export const deleteMessage = async (req, res, next) => {
  try {
    const msg = await Message.findOne({ _id: req.params.msgId, sender: req.user._id })
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' })

    msg.deleted = true
    msg.text = ''
    msg.mediaUrl = ''
    await msg.save()

    const io = getIO()
    io?.to(msg.chatId.toString()).emit('message_deleted', { msgId: msg._id, chatId: msg.chatId })

    res.json({ success: true })
  } catch (err) { next(err) }
}

export const reactToMessage = async (req, res, next) => {
  try {
    const { emoji } = req.body
    const msg = await Message.findById(req.params.msgId)
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' })

    const existingIdx = msg.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    )
    if (existingIdx > -1) {
      msg.reactions.splice(existingIdx, 1)
    } else {
      msg.reactions.push({ emoji, user: req.user._id })
    }
    await msg.save()

    const io = getIO()
    io?.to(msg.chatId.toString()).emit('message_reaction', {
      msgId: msg._id, reactions: msg.reactions, chatId: msg.chatId
    })

    res.json({ success: true, reactions: msg.reactions })
  } catch (err) { next(err) }
}

export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })
    res.json({ success: true, url: req.file.path, originalName: req.file.originalname })
  } catch (err) { next(err) }
}

export const pinMessage = async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.msgId)
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' })
    msg.pinned = !msg.pinned
    await msg.save()
    await Chat.findByIdAndUpdate(
      msg.chatId,
      msg.pinned
        ? { $addToSet: { pinnedMessages: msg._id } }
        : { $pull: { pinnedMessages: msg._id } }
    )
    res.json({ success: true, pinned: msg.pinned })
  } catch (err) { next(err) }
}

export const starMessage = async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.msgId)
    if (!msg) return res.status(404).json({ success: false, message: 'Not found' })
    const alreadyStarred = msg.starred.includes(req.user._id)
    if (alreadyStarred) {
      msg.starred.pull(req.user._id)
    } else {
      msg.starred.push(req.user._id)
    }
    await msg.save()
    res.json({ success: true, starred: !alreadyStarred })
  } catch (err) { next(err) }
}

export const markAsRead = async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.msgId)
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' })

    if (!msg.readBy) msg.readBy = []

    const alreadyRead = msg.readBy.some(
      (id) => id.toString() === req.user._id.toString()
    )
    if (!alreadyRead) msg.readBy.push(req.user._id)

    msg.status = 'read'
    await msg.save()

    const io = getIO()
    io?.to(msg.chatId.toString()).emit('message_read', {
      msgId: msg._id,
      userId: req.user._id,
    })

    return res.json({ success: true, message: 'Marked as read' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, message: err.message })
  }
}