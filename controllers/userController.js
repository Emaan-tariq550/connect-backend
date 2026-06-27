import User from '../models/User.js'
import Community from '../models/Community.js'
import { updateTrustScore } from '../utils/trustEngine.js'

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query
    if (!q?.trim()) return res.json({ success: true, users: [] })

    const users = await User.find({
      $or: [
        { fullName: { $regex: q.trim(), $options: 'i' } },
        { username: { $regex: q.trim(), $options: 'i' } },
      ],
      _id: { $ne: req.user._id },
      isBanned: false,
    }).select('fullName username avatar isOnline lastSeen trustScore trustLevel badges').limit(20)

    res.json({ success: true, users })
  } catch (err) { next(err) }
}

// FIXED: response mein { user: ... } wrap kiya, frontend res.data.user expect karta hai
export const getProfile = async (req, res) => {
  try {
    const { userId, username } = req.params

    let user
    if (username) {
      user = await User.findOne({ username }).select('-password')
    } else {
      user = await User.findById(userId).select('-password')
    }

    if (!user) return res.status(404).json({ success: false, message: 'User not found' })

    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, bio, statusMessage, skills, socialLinks } = req.body
    const updates = {}
    if (fullName !== undefined) updates.fullName = fullName.trim()
    if (bio !== undefined) updates.bio = bio
    if (statusMessage !== undefined) updates.statusMessage = statusMessage
    if (skills !== undefined) updates.skills = skills
    if (socialLinks !== undefined) updates.socialLinks = socialLinks

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true })

    if (user.avatar && user.bio && !user.trustFactors?.profileComplete) {
      await User.findByIdAndUpdate(req.user._id, { 'trustFactors.profileComplete': true })
      await updateTrustScore(req.user._id, 'PROFILE_COMPLETED')
    }

    res.json({ success: true, user: user.toPublicJSON() })
  } catch (err) { next(err) }
}

export const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' })
    const user = await User.findByIdAndUpdate(req.user._id, { avatar: req.file.path }, { new: true })
    res.json({ success: true, avatar: user.avatar, user: user.toPublicJSON() })
  } catch (err) { next(err) }
}

export const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body
    await User.findByIdAndUpdate(req.user._id, { statusMessage: status })
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const updatePrivacy = async (req, res, next) => {
  try {
    const { messagingPermission, profileVisibility, showLastSeen } = req.body
    const updates = {}
    if (messagingPermission) updates['privacySettings.messagingPermission'] = messagingPermission
    if (profileVisibility) updates['privacySettings.profileVisibility'] = profileVisibility
    if (showLastSeen !== undefined) updates['privacySettings.showLastSeen'] = showLastSeen
    await User.findByIdAndUpdate(req.user._id, updates)
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const getSuggestions = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 4

    const currentUser = await User.findById(req.user._id).select('friends sentRequests receivedRequests')

    const excludeIds = [
      req.user._id,
      ...(currentUser.friends || []),
      ...(currentUser.sentRequests || []),
      ...(currentUser.receivedRequests || []),
    ]

    const users = await User.find({
      _id: { $nin: excludeIds },
      isBanned: false,
      isEmailVerified: true,
    })
      .select('fullName username avatar isOnline trustScore trustLevel')
      .limit(limit)

    res.json({ success: true, users })
  } catch (err) { next(err) }
}

// FIXED: ye function missing tha, isliye /api/users/stats 500 de raha tha
export const getUserStats = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('friends sentRequests trustScore')

    const communitiesCount = await Community.countDocuments({
      'members.user': req.user._id,
    })

    const stats = {
      friends: user.friends?.length || 0,
      communities: communitiesCount,
      messagesSent: user.stats?.messagesSent || 0,
      trustScore: user.trustScore || 0,
    }

    res.json({ success: true, stats })
  } catch (err) { next(err) }
}