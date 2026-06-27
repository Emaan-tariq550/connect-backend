import crypto from 'crypto'
import User from '../models/User.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/generateToken.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js'
import { updateTrustScore } from '../utils/trustEngine.js'

const generateOTP = () => crypto.randomInt(100000, 999999).toString()

export const register = async (req, res, next) => {
  try {
    const { fullName, username, email, password } = req.body

    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' })
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email already registered' })

    const existingUsername = await User.findOne({ username: username.toLowerCase() })
    if (existingUsername) return res.status(400).json({ success: false, message: 'Username already taken' })

    const otp = generateOTP()
    const user = await User.create({
      fullName: fullName.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      emailOTP: otp,
      emailOTPExpiry: new Date(Date.now() + 15 * 60 * 1000),
      trustScore: 0,
      trustLevel: 'Average',
    })

    await sendVerificationEmail(user.email, otp)

    res.status(201).json({
      success: true,
      message: 'Account created! Check your email for verification OTP.',
      userId: user._id,
    })
  } catch (err) { next(err) }
}

export const verifyEmail = async (req, res, next) => {
  try {
    const { userId, otp } = req.body
    const user = await User.findById(userId).select('+emailOTP +emailOTPExpiry')
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: 'Email already verified' })
    if (user.emailOTP !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' })
    if (user.emailOTPExpiry < new Date()) return res.status(400).json({ success: false, message: 'OTP expired' })

    await User.findByIdAndUpdate(userId, {
      isEmailVerified: true,
      emailOTP: null,
      emailOTPExpiry: null,
      'trustFactors.emailVerified': true,
    })

    await updateTrustScore(userId, 'EMAIL_VERIFIED')

    const accessToken = generateAccessToken(userId)
    const refreshToken = generateRefreshToken(userId)
    await User.findByIdAndUpdate(userId, { $push: { refreshTokens: refreshToken } })

    const freshUser = await User.findById(userId)
    res.json({ success: true, message: 'Email verified!', accessToken, refreshToken, user: freshUser.toPublicJSON() })
  } catch (err) { next(err) }
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' })

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshTokens')
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' })
    if (user.isBanned) return res.status(403).json({ success: false, message: `Account banned: ${user.banReason}` })

    const isMatch = await user.comparePassword(password)
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' })

    if (!user.isEmailVerified) {
      const otp = generateOTP()
      await User.findByIdAndUpdate(user._id, {
        emailOTP: otp,
        emailOTPExpiry: new Date(Date.now() + 15 * 60 * 1000),
      })
      await sendVerificationEmail(user.email, otp)
      return res.status(403).json({ success: false, message: 'Email not verified. OTP resent.', userId: user._id, requiresVerification: true })
    }

    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)

    // Keep max 5 refresh tokens
    const tokens = [...(user.refreshTokens || []).slice(-4), refreshToken]
    await User.findByIdAndUpdate(user._id, { refreshTokens: tokens, isOnline: true, lastSeen: new Date() })

    const publicUser = await User.findById(user._id)
    res.json({ success: true, accessToken, refreshToken, user: publicUser.toPublicJSON() })
  } catch (err) { next(err) }
}

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' })

    const decoded = verifyRefreshToken(token)
    const user = await User.findById(decoded.id).select('+refreshTokens')
    if (!user || !user.refreshTokens.includes(token)) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' })
    }

    const newAccessToken = generateAccessToken(user._id)
    const newRefreshToken = generateRefreshToken(user._id)

    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: token },
      $push: { refreshTokens: newRefreshToken },
    })

    res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' })
  }
}

export const logout = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: token },
      isOnline: false,
      lastSeen: new Date(),
    })
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (err) { next(err) }
}

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email: email?.toLowerCase() })
    if (!user) return res.json({ success: true, message: 'If this email exists, OTP has been sent.' })

    const otp = generateOTP()
    await User.findByIdAndUpdate(user._id, {
      passwordResetOTP: otp,
      passwordResetOTPExpiry: new Date(Date.now() + 15 * 60 * 1000),
    })
    await sendPasswordResetEmail(user.email, otp)
    res.json({ success: true, message: 'OTP sent to your email.', userId: user._id })
  } catch (err) { next(err) }
}

export const resetPassword = async (req, res, next) => {
  try {
    const { userId, otp, newPassword } = req.body
    const user = await User.findById(userId).select('+passwordResetOTP +passwordResetOTPExpiry')
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    if (user.passwordResetOTP !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' })
    if (user.passwordResetOTPExpiry < new Date()) return res.status(400).json({ success: false, message: 'OTP expired' })
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password too short' })

    user.password = newPassword
    user.passwordResetOTP = null
    user.passwordResetOTPExpiry = null
    user.refreshTokens = []
    await user.save()

    res.json({ success: true, message: 'Password reset successfully. Please log in.' })
  } catch (err) { next(err) }
}

export const getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() })
}

export const resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: 'Already verified' })

    const otp = generateOTP()
    await User.findByIdAndUpdate(userId, {
      emailOTP: otp,
      emailOTPExpiry: new Date(Date.now() + 15 * 60 * 1000),
    })
    await sendVerificationEmail(user.email, otp)
    res.json({ success: true, message: 'OTP resent.' })
  } catch (err) { next(err) }
}