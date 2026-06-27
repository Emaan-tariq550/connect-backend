// routes/channels.js
import express from 'express'
import { getChannelMessages, sendChannelMessage } from '../controllers/channelController.js'
import { protect } from '../middleware/auth.js'
import { messageLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()
router.use(protect)
router.get('/:channelId/messages', getChannelMessages)
router.post('/:channelId/messages', messageLimiter, sendChannelMessage)
export default router