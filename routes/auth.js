// routes/auth.js
import express from 'express'
import { register, login, logout, verifyEmail, refreshToken, forgotPassword, resetPassword, getMe, resendOTP } from '../controllers/authController.js'
import { protect } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()
router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.post('/logout', protect, logout)
router.post('/verify-email', verifyEmail)
router.post('/resend-otp', resendOTP)
router.post('/refresh', refreshToken)
router.post('/forgot-password', authLimiter, forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/me', protect, getMe)
export default router