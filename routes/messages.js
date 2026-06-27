import express from 'express'
import {
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  uploadMedia,
  pinMessage,
  starMessage,
  markAsRead
} from '../controllers/messageController.js'
import { protect } from '../middleware/auth.js'
import { upload } from '../config/cloudinary.js'
import { messageLimiter, uploadLimiter } from '../middleware/rateLimiter.js'

const router = express.Router()

router.use(protect)
router.post('/upload', uploadLimiter, upload.single('file'), uploadMedia)
router.get('/:chatId', getMessages)
router.post('/', messageLimiter, upload.single('file'), sendMessage)
router.put('/:msgId', editMessage)
router.delete('/:msgId', deleteMessage)
router.post('/:msgId/react', reactToMessage)
router.put('/:msgId/pin', pinMessage)
router.put('/:msgId/star', starMessage)
router.put('/:msgId/read', markAsRead)

export default router