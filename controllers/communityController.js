import Community from '../models/Community.js'
import Channel from '../models/Channel.js'
import User from '../models/User.js'
import { updateTrustScore } from '../utils/trustEngine.js'
import Post from '../models/Post.js'
import crypto from 'crypto'

export const getMyCommunities = async (req, res, next) => {
  try {
    const communities = await Community.find({ 'members.user': req.user._id })
      .select('name description banner icon memberCount isPrivate isVerified createdAt')
      .sort({ updatedAt: -1 })
    res.json({ success: true, communities })
  } catch (err) { next(err) }
}

export const getCommunityById = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('owner', 'fullName username avatar')
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' })

    const isMember = community.members.some(m => m.user.toString() === req.user._id.toString())
    if (community.isPrivate && !isMember) {
      return res.status(403).json({ success: false, message: 'Private community' })
    }
    res.json({ success: true, community })
  } catch (err) { next(err) }
}

export const createCommunity = async (req, res, next) => {
  try {
    const { name, description, isPrivate, tags } = req.body
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Community name required' })

    const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase()
    const community = await Community.create({
      name: name.trim(),
      description: description || '',
      isPrivate: isPrivate || false,
      tags: tags || [],
      owner: req.user._id,
      inviteCode,
      members: [{ user: req.user._id, role: 'owner' }],
      memberCount: 1,
    })

    // Default channels
    await Channel.insertMany([
      { community: community._id, name: 'general', type: 'text', category: 'Text Channels' },
      { community: community._id, name: 'announcements', type: 'announcement', category: 'Text Channels' },
      { community: community._id, name: 'General Voice', type: 'voice', category: 'Voice Channels' },
    ])

    await User.findByIdAndUpdate(req.user._id, { $inc: { communityScore: 5 } })
    await updateTrustScore(req.user._id, 'COMMUNITY_CREATED')

    res.status(201).json({ success: true, community })
  } catch (err) { next(err) }
}

export const joinCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id)
    if (!community) return res.status(404).json({ success: false, message: 'Not found' })

    const isMember = community.members.some(m => m.user.toString() === req.user._id.toString())
    if (isMember) return res.status(400).json({ success: false, message: 'Already a member' })

    community.members.push({ user: req.user._id, role: 'member' })
    community.memberCount = community.members.length
    await community.save()

    res.json({ success: true, message: 'Joined community' })
  } catch (err) { next(err) }
}

export const leaveCommunity = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id)
    if (!community) return res.status(404).json({ success: false, message: 'Not found' })
    if (community.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Owner cannot leave. Transfer ownership first.' })
    }
    community.members = community.members.filter(m => m.user.toString() !== req.user._id.toString())
    community.memberCount = community.members.length
    await community.save()
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const getMembers = async (req, res, next) => {
  try {
    const community = await Community.findById(req.params.id).populate('members.user', 'fullName username avatar isOnline trustScore trustLevel badges')
    if (!community) return res.status(404).json({ success: false, message: 'Not found' })

    const members = community.members.map(m => ({
      _id: m.user._id,
      fullName: m.user.fullName,
      username: m.user.username,
      avatar: m.user.avatar,
      isOnline: m.user.isOnline,
      trustScore: m.user.trustScore,
      trustLevel: m.user.trustLevel,
      badges: m.user.badges,
      role: m.role,
      joinedAt: m.joinedAt,
    }))

    res.json({ success: true, members })
  } catch (err) { next(err) }
}

export const updateMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body
    const community = await Community.findById(req.params.id)
    if (!community) return res.status(404).json({ success: false, message: 'Not found' })

    const isOwnerOrAdmin = community.members.some(
      m => m.user.toString() === req.user._id.toString() && ['owner', 'admin'].includes(m.role)
    )
    if (!isOwnerOrAdmin) return res.status(403).json({ success: false, message: 'Insufficient permissions' })

    const memberIdx = community.members.findIndex(m => m.user.toString() === req.params.userId)
    if (memberIdx === -1) return res.status(404).json({ success: false, message: 'Member not found' })

    community.members[memberIdx].role = role
    await community.save()
    res.json({ success: true })
  } catch (err) { next(err) }
}
export const getAllCommunities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 12
    const skip = (page - 1) * limit

    const communities = await Community.find()
      .skip(skip)
      .limit(limit)
      .populate('owner', 'username avatar')

    const total = await Community.countDocuments()

    // isMember flag add karo har community mein
    const withMembership = communities.map((c) => ({
      ...c.toObject(),
      isMember: c.members.some((m) => m.user.toString() === req.user._id.toString()),
    }))

    res.json({
      success: true,
      communities: withMembership,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const exploreCommunities = async (req, res) => {
  try {
    const search = req.query.search || ''

    const communities = await Community.find(
      search ? { name: { $regex: search, $options: 'i' } } : {}
    ).populate('owner', 'username avatar')

    // isMember flag add karo
    const withMembership = communities.map((c) => ({
      ...c.toObject(),
      isMember: c.members.some((m) => m.user.toString() === req.user._id.toString()),
    }))

    res.json({ success: true, communities: withMembership })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
export const getProfile = async (req, res) => {
  try {
    const { userId, username } = req.params

    let user
    if (username) {
      user = await User.findOne({ username }).select('-password')
    } else {
      user = await User.findById(userId).select('-password')
    }

    if (!user) return res.status(404).json({ message: 'User not found' })

    res.json({ success: true, user })   // ✅ user wrap kiya { user: ... } mein
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}
export const getCommunityFeed = async (req, res, next) => {
  try {
    const { id } = req.params
    const page = parseInt(req.query.page) || 1
    const limit = 10
    const skip = (page - 1) * limit

    const community = await Community.findById(id)
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' })

    const isMember = community.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    )
    if (community.isPrivate && !isMember) {
      return res.status(403).json({ success: false, message: 'Private community' })
    }

    const posts = await Post.find({ community: id })
      .populate('author', 'fullName username avatar trustScore')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Post.countDocuments({ community: id })

    res.json({ success: true, posts, total, hasMore: skip + posts.length < total })
  } catch (err) { next(err) }
}

export const createPost = async (req, res, next) => {
  try {
    const { id } = req.params
    const { content } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Post content required' })
    }

    const community = await Community.findById(id)
    if (!community) return res.status(404).json({ success: false, message: 'Community not found' })

    const isMember = community.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    )
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Join community first' })
    }

    const post = await Post.create({
      community: id,
      author: req.user._id,
      content: content.trim(),
    })

    await post.populate('author', 'fullName username avatar trustScore')

    res.status(201).json({ success: true, post })
  } catch (err) { next(err) }
}