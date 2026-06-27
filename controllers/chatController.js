import Chat from '../models/Chat.js'
import Message from '../models/Message.js'
import User from '../models/User.js'

export const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user._id, isArchived: false })
      .populate('participants', 'fullName username avatar isOnline lastSeen trustScore trustLevel')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'fullName username' } })
      .sort({ updatedAt: -1 })

    const chatsWithUnread = chats.map(chat => {
      const unreadEntry = chat.unreadCounts?.find(u => u.user?.toString() === req.user._id.toString())
      return { ...chat.toObject(), unreadCount: unreadEntry?.count || 0 }
    })

    res.json({ success: true, chats: chatsWithUnread })
  } catch (err) { next(err) }
}

export const getOrCreateDM = async (req, res, next) => {
  try {
    const { userId } = req.params
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Can't chat with yourself" })
    }

    const target = await User.findById(userId)
    if (!target) return res.status(404).json({ success: false, message: 'User not found' })

    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, userId], $size: 2 },
    }).populate('participants', 'fullName username avatar isOnline lastSeen trustScore trustLevel')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'fullName' } })

    if (!chat) {
      chat = await Chat.create({ participants: [req.user._id, userId], isGroup: false })
      await chat.populate('participants', 'fullName username avatar isOnline lastSeen trustScore trustLevel')
    }

    res.json({ success: true, chat })
  } catch (err) { next(err) }
}

export const createGroup = async (req, res, next) => {
  try {
    const { groupName, participantIds, groupDescription } = req.body
    if (!groupName?.trim()) return res.status(400).json({ success: false, message: 'Group name required' })
    if (!participantIds?.length) return res.status(400).json({ success: false, message: 'Add at least one member' })

    const allParticipants = [...new Set([req.user._id.toString(), ...participantIds])]
    const chat = await Chat.create({
      isGroup: true,
      groupName: groupName.trim(),
      groupDescription,
      participants: allParticipants,
      admin: req.user._id,
      unreadCounts: allParticipants.map(id => ({ user: id, count: 0 })),
    })
    await chat.populate('participants', 'fullName username avatar isOnline trustScore trustLevel')

    res.status(201).json({ success: true, chat })
  } catch (err) { next(err) }
}

export const getChatById = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, participants: req.user._id })
      .populate('participants', 'fullName username avatar isOnline lastSeen trustScore trustLevel badges')
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' })
    res.json({ success: true, chat })
  } catch (err) { next(err) }
}

export const markRead = async (req, res, next) => {
  try {
    await Chat.findByIdAndUpdate(req.params.chatId, {
      $set: { 'unreadCounts.$[elem].count': 0 },
    }, { arrayFilters: [{ 'elem.user': req.user._id }] })
    res.json({ success: true })
  } catch (err) { next(err) }
}