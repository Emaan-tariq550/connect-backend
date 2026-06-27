import express from 'express'
import { getMyTrustScore, getUserTrustScore, getLeaderboard, getTrustHistory, submitFeedback } from '../controllers/trustController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()
router.use(protect)
router.get('/me', getMyTrustScore)
router.get('/stats', getMyTrustScore)        // ✅ /trust/stats add kiya
router.get('/leaderboard', getLeaderboard)
router.get('/user/:userId', getUserTrustScore)
router.get('/history', getTrustHistory)      // ✅ /trust/history add kiya (without userId)
router.get('/history/:userId', getTrustHistory)
router.post('/feedback', submitFeedback)
router.post('/report', submitFeedback)       // ✅ /trust/report add kiya

export default router