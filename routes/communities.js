import express from 'express'
import {
  getMyCommunities,
  getCommunityById,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  getMembers,
  updateMemberRole,
  getAllCommunities,
  exploreCommunities,
  getCommunityFeed,
  createPost,
} from '../controllers/communityController.js'
import { protect } from '../middleware/auth.js'

const router = express.Router()
router.use(protect)

router.get('/', getAllCommunities)
router.get('/mine', getMyCommunities)
router.get('/explore', exploreCommunities)
router.post('/', createCommunity)
router.get('/:id', getCommunityById)
router.post('/:id/join', joinCommunity)
router.post('/:id/leave', leaveCommunity)
router.get('/:id/members', getMembers)
router.put('/:id/members/:userId', updateMemberRole)
router.get('/:id/feed', getCommunityFeed)
router.post('/:id/post', createPost)

export default router