import User from '../models/User.js'
import TrustHistory from '../models/TrustHistory.js'

export const TRUST_EVENTS = {
  EMAIL_VERIFIED: { points: 10, label: 'Email Verified' },
  PROFILE_COMPLETED: { points: 10, label: 'Profile Completed' },
  MESSAGE_SENT: { points: 0.05, label: 'Message Sent' },
  CALL_COMPLETED: { points: 2, label: 'Successful Call' },
  POSITIVE_FEEDBACK: { points: 3, label: 'Positive Feedback' },
  COMMUNITY_CREATED: { points: 5, label: 'Community Created' },
  REPORT_RECEIVED: { points: -10, label: 'User Reported' },
  SPAM_DETECTED: { points: -5, label: 'Spam Detected' },
  TOXIC_MESSAGE: { points: -8, label: 'Toxic Message Detected' },
  BANNED: { points: -50, label: 'Account Banned' },
}

export const TRUST_LEVELS = {
  TRUSTED: { min: 90, max: 100, label: 'Trusted', color: '#10b981', icon: '🛡️', bg: 'emerald' },
  RELIABLE: { min: 70, max: 89, label: 'Reliable', color: '#3b82f6', icon: '✅', bg: 'blue' },
  AVERAGE: { min: 50, max: 69, label: 'Average', color: '#f59e0b', icon: '⚡', bg: 'yellow' },
  SUSPICIOUS: { min: 0, max: 49, label: 'Suspicious', color: '#ef4444', icon: '⚠️', bg: 'red' },
}

export const getTrustLevel = (score) => {
  if (score >= 90) return TRUST_LEVELS.TRUSTED
  if (score >= 70) return TRUST_LEVELS.RELIABLE
  if (score >= 50) return TRUST_LEVELS.AVERAGE
  return TRUST_LEVELS.SUSPICIOUS
}

export const getTrustColor = (score) => getTrustLevel(score).color

export const updateTrustScore = async (userId, eventKey, metadata = {}) => {
  const event = TRUST_EVENTS[eventKey]
  if (!event) return

  const user = await User.findById(userId)
  if (!user) return

  const oldScore = user.trustScore
  const newScore = Math.max(0, Math.min(100, oldScore + event.points))
  const level =
    newScore >= 90 ? 'Trusted' :
    newScore >= 70 ? 'Reliable' :
    newScore >= 50 ? 'Average' : 'Suspicious'

  await User.findByIdAndUpdate(userId, {
    trustScore: Math.round(newScore * 10) / 10,
    trustLevel: level,
  })

  if (Math.abs(event.points) >= 1) {
    await TrustHistory.create({
      user: userId,
      event: eventKey,
      label: event.label,
      points: event.points,
      oldScore,
      newScore,
      metadata,
    })
  }

  return { oldScore, newScore, level }
}

export const recalculateTrustScore = async (userId) => {
  const user = await User.findById(userId)
  if (!user) return

  let score = 0
  if (user.isEmailVerified) score += 10
  if (user.avatar && user.bio) score += 10
  score += Math.min(user.messageCount * 0.05, 20)
  score += Math.min((user.positiveRatings || 0) * 3, 20)
  score += Math.min((user.completedCalls || 0) * 2, 15)
  score -= Math.min((user.reportCount || 0) * 10, 30)
  score += Math.min((user.communityScore || 0), 10)

  score = Math.max(0, Math.min(100, score))
  const level = score >= 90 ? 'Trusted' : score >= 70 ? 'Reliable' : score >= 50 ? 'Average' : 'Suspicious'

  await User.findByIdAndUpdate(userId, { trustScore: Math.round(score), trustLevel: level })
  return score
}