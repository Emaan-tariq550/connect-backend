import express from 'express'
import { getUserPosts, createPost } from '../controllers/postController.js'
import { protect } from '../middleware/auth.js'
import { upload } from '../config/cloudinary.js'
import { loadProfileUser } from '../middleware/loadProfileUser.js'

const router = express.Router()
router.use(protect)

router.post('/', upload.single('file'), createPost)
router.get('/user/:username', loadProfileUser, getUserPosts)

export default router