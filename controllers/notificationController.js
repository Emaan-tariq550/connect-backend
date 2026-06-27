import Notification from '../models/Notification.js'

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('actor', 'fullName username avatar')
      .sort({ createdAt: -1 })
      .limit(50)
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false })
    res.json({ success: true, notifications, unreadCount })
  } catch (err) { next(err) }
}

export const markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { isRead: true })
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true })
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const deleteNotification = async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id })
    res.json({ success: true })
  } catch (err) { next(err) }
}