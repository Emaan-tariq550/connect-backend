import rateLimit from 'express-rate-limit'

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // ✅ 10 se 100 kiya
  message: { success: false, message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const messageLimiter = rateLimit({
  windowMs: 1000,
  max: 50, // ✅ 5 se 50 kiya
  message: { success: false, message: 'Slow down! Too many messages.' },
})

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500, // ✅ 100 se 500 kiya
  message: { success: false, message: 'Too many requests.' },
})

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 50, // ✅ 20 se 50 kiya
  message: { success: false, message: 'Too many uploads.' },
})