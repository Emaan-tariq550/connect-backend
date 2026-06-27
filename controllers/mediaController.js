import Media from '../models/Media.js'

// POST /users/media — upload karo
export const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const isVideo = req.file.mimetype.startsWith('video')

    const media = await Media.create({
      user: req.user._id,
      url: req.file.path,
      type: isVideo ? 'video' : 'image',
      publicId: req.file.filename || '',
    })

    res.status(201).json({ success: true, media })
  } catch (err) { next(err) }
}

// GET /users/:username/media — profile ki media fetch karo
export const getUserMedia = async (req, res, next) => {
  try {
    const media = await Media.find({ user: req.profileUser._id })
      .sort({ createdAt: -1 })
      .limit(30)

    res.json({ success: true, media })
  } catch (err) { next(err) }
}