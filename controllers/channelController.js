import Channel from '../models/Channel.js'
import ChannelMessage from '../models/ChannelMessage.js'
import Community from '../models/Community.js'
import { getIO } from '../socket/socketManager.js'

const checkMembership = async (communityId, userId) => {
  const community = await Community.findOne({ _id: communityId, 'members.user': userId })
  return !!community
}

export const getChannels = async (req, res, next) => {
  try {
    const isMember = await checkMembership(req.params.communityId, req.user._id)
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a member' })
    const channels = await Channel.find({ community: req.params.communityId, isArchived: false }).sort({ createdAt: 1 })
    res.json({ success: true, channels })
  } catch (err) { next(err) }
}

export const createChannel = async (req, res, next) => {
  try {
    const { name, type, description, category, isPrivate } = req.body
    const community = await Community.findById(req.params.communityId)
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' })

    const isAdmin = community.members.some(
      m => m.user.toString() === req.user._id.toString() && ['owner', 'admin'].includes(m.role)
    )
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Admin required' })

    const channel = await Channel.create({
      community: req.params.communityId,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      type: type || 'text',
      description: description || '',
      category: category || 'General',
      isPrivate: isPrivate || false,
    })

    res.status(201).json({ success: true, channel })
  } catch (err) { next(err) }
}

export const getChannelMessages = async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.channelId)
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' })

    const isMember = await checkMembership(channel.community, req.user._id)
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a member' })

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 30
    const total = await ChannelMessage.countDocuments({ channelId: req.params.channelId, deleted: false })

    const messages = await ChannelMessage.find({ channelId: req.params.channelId })
      .populate('sender', 'fullName username avatar trustScore trustLevel badges')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.json({ success: true, messages: messages.reverse(), hasMore: page * limit < total })
  } catch (err) { next(err) }
}

export const sendChannelMessage = async (req, res, next) => {
  try {
    const { text, mediaUrl, mediaType, fileName } = req.body
    const channel = await Channel.findById(req.params.channelId)
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' })

    const isMember = await checkMembership(channel.community, req.user._id)
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a member' })

    if (channel.type === 'announcement') {
      const community = await Community.findById(channel.community)
      const isAdmin = community.members.some(
        m => m.user.toString() === req.user._id.toString() && ['owner', 'admin'].includes(m.role)
      )
      if (!isAdmin) return res.status(403).json({ success: false, message: 'Only admins can post in announcements' })
    }

    const message = await ChannelMessage.create({
      channelId: req.params.channelId,
      community: channel.community,
      sender: req.user._id,
      text: text?.trim() || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || '',
      fileName: fileName || '',
    })

    await message.populate('sender', 'fullName username avatar trustScore trustLevel badges')
    await Channel.findByIdAndUpdate(req.params.channelId, { lastMessage: message._id })

    const io = getIO()
    io?.to(`channel_${req.params.channelId}`).emit('channel_message', { ...message.toObject(), channelId: req.params.channelId })

    res.status(201).json({ success: true, message })
  } catch (err) { next(err) }
}