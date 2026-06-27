import express from 'express'
import {
  searchUsers, getProfile, updateProfile,
  updateAvatar, updateStatus, updatePrivacy,
  getSuggestions, getUserStats,
} from '../controllers/userController.js'
import { uploadMedia, getUserMedia } from '../controllers/mediaController.js'
import { protect } from '../middleware/auth.js'
import { upload } from '../config/cloudinary.js'
import { loadProfileUser } from '../middleware/loadProfileUser.js'  // ✅ ye missing tha

const router = express.Router()
router.use(protect)

router.get('/search', searchUsers)
router.get('/suggestions', getSuggestions)
router.get('/stats', getUserStats)
router.put('/profile', updateProfile)
router.put('/avatar', upload.single('avatar'), updateAvatar)
router.put('/status', updateStatus)
router.put('/privacy', updatePrivacy)

router.post('/media', upload.single('media'), uploadMedia)
router.get('/:username/media', loadProfileUser, getUserMedia)

router.get('/profile/:username', getProfile)
router.get('/:userId', getProfile)

export default router