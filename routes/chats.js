// routes/chats.js
import express from 'express'
import { getMyChats, getOrCreateDM, createGroup, getChatById, markRead } from '../controllers/chatController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()
router.use(protect)
router.get('/', getMyChats)
router.post('/dm/:userId', getOrCreateDM)
router.post('/group', createGroup)
router.get('/:chatId', getChatById)
router.put('/:chatId/read', markRead)
export default router