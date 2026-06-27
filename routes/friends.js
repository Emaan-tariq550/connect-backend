import express from 'express'
import {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  sendRequest,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  removeFriend,
  blockUser,
  getOnlineFriends,
  getFriendshipStatus,
} from '../controllers/friendController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()
router.use(protect)

router.get('/', getFriends)
router.get('/online', getOnlineFriends)
router.get('/requests/incoming', getIncomingRequests)
router.get('/requests/outgoing', getOutgoingRequests)
router.get('/status/:userId', getFriendshipStatus)
router.post('/request/:userId', sendRequest)
router.patch('/accept/:userId', acceptRequest)
router.patch('/reject/:userId', rejectRequest)
router.delete('/cancel/:userId', cancelRequest)
router.delete('/remove/:userId', removeFriend)
router.post('/block/:userId', blockUser)

export default router