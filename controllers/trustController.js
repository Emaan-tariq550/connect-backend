import User from '../models/User.js'
import TrustHistory from '../models/TrustHistory.js'
import { getTrustLevel, updateTrustScore, TRUST_LEVELS } from '../utils/trustEngine.js'

export const getMyTrustScore = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('trustScore trustLevel trustFactors badges')
    const history = await TrustHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
    res.json({
      success: true,
      trustScore: user.trustScore,
      trustLevel: user.trustLevel,
      factors: user.trustFactors,
      history,
    })
  } catch (err) { next(err) }
}

export const getUserTrustScore = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('trustScore trustLevel badges fullName username avatar')
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    res.json({
      success: true,
      trustScore: user.trustScore,
      trustLevel: user.trustLevel,
      badges: user.badges,
      user: { fullName: user.fullName, username: user.username, avatar: user.avatar },
    })
  } catch (err) { next(err) }
}

export const getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find({ isBanned: false, isEmailVerified: true })
      .select('fullName username avatar trustScore trustLevel badges isOnline')
      .sort({ trustScore: -1 })
      .limit(50)
    res.json({ success: true, leaderboard: users })
  } catch (err) { next(err) }
}

export const getTrustHistory = async (req, res, next) => {
  try {
    const history = await TrustHistory.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(30)
    res.json({ success: true, history })
  } catch (err) { next(err) }
}

export const submitFeedback = async (req, res, next) => {
  try {
    const { userId, type } = req.body
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Can't rate yourself" })
    }
    if (type === 'positive') {
      await User.findByIdAndUpdate(userId, { $inc: { positiveRatings: 1 } })
      await updateTrustScore(userId, 'POSITIVE_FEEDBACK', { from: req.user._id })
    }
    res.json({ success: true })
  } catch (err) { next(err) }
}