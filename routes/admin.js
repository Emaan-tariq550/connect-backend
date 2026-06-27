// routes/admin.js
import express from 'express'
import { getStats, getReports, resolveReport, getUsers, banUser, unbanUser, getAIStats } from '../controllers/adminController.js'
import { protect } from '../middleware/auth.js'
import { adminOnly } from '../middleware/adminOnly.js'

const router = express.Router()
router.use(protect, adminOnly)
router.get('/stats', getStats)
router.get('/reports', getReports)
router.put('/reports/:reportId/resolve', resolveReport)
router.get('/users', getUsers)
router.put('/users/:userId/ban', banUser)
router.put('/users/:userId/unban', unbanUser)
router.get('/ai-stats', getAIStats)
export default router