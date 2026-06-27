import { verifyAccessToken } from '../utils/generateToken.js'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyAccessToken(token)
    const user = await User.findById(decoded.id).select('-password -refreshTokens -emailOTP -passwordResetOTP')
    if (!user) return res.status(401).json({ success: false, message: 'User not found' })
    if (user.isBanned) return res.status(403).json({ success: false, message: 'Account banned' })
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = verifyAccessToken(token)
      req.user = await User.findById(decoded.id).select('-password -refreshTokens')
    }
  } catch {}
  next()
}