import User from '../models/User.js'

export const loadProfileUser = async (req, res, next) => {
  try {
    const { username } = req.params
    const user = await User.findOne({ username }).select('_id username fullName')
    if (!user) return res.status(404).json({ success: false, message: 'User not found' })
    req.profileUser = user
    next()
  } catch (err) { next(err) }
}