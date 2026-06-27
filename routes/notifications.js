// routes/notifications.js
import express from 'express'
import { getNotifications, markRead, markAllRead, deleteNotification } from '../controllers/notificationController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()
router.use(protect)
router.get('/', getNotifications)
router.put('/:id/read', markRead)
router.put('/read-all', markAllRead)
router.delete('/:id', deleteNotification)
export default router