import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import multer from 'multer'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image')
    const isVideo = file.mimetype.startsWith('video')
    const isAudio = file.mimetype.startsWith('audio')
    return {
      folder: `connect/${isImage ? 'images' : isVideo ? 'videos' : isAudio ? 'audio' : 'files'}`,
      resource_type: isVideo ? 'video' : isAudio ? 'video' : 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mp3', 'webm', 'pdf', 'zip', 'doc', 'docx'],
      transformation: isImage ? [{ quality: 'auto', fetch_format: 'auto' }] : undefined,
    }
  },
})

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
})

export { cloudinary }