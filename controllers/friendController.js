import User from '../models/User.js'
import FriendRequest from '../models/FriendRequest.js'
import Notification from '../models/Notification.js'
import { getIO } from '../socket/socketManager.js'

const emitToUser = (userId, event, data) => {
  const io = getIO()
  io?.to(`user_${userId}`).emit(event, data)
}

export const getFriends = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'fullName username avatar isOnline lastSeen trustScore trustLevel badges')
    res.json({ success: true, friends: user.friends || [] })
  } catch (err) { next(err) }
}

// FIXED: incoming requests — receiver is current user
export const getIncomingRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending',
    })
      .populate('sender', 'fullName username avatar trustScore trustLevel')
      .sort({ createdAt: -1 })
    res.json({ success: true, requests })
  } catch (err) { next(err) }
}

// FIXED: outgoing requests — sender is current user
export const getOutgoingRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({
      sender: req.user._id,
      status: 'pending',
    })
      .populate('receiver', 'fullName username avatar trustScore trustLevel')
      .sort({ createdAt: -1 })
    res.json({ success: true, requests })
  } catch (err) { next(err) }
}

export const sendRequest = async (req, res, next) => {
  try {
    const { userId } = req.params
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Can't send request to yourself" })
    }

    const target = await User.findById(userId)
    if (!target) return res.status(404).json({ success: false, message: 'User not found' })
    if (target.blockedUsers?.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Cannot send request' })
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
      status: 'pending',
    })
    if (existing) return res.status(400).json({ success: false, message: 'Request already sent' })

    const alreadyFriends = await User.findOne({ _id: req.user._id, friends: userId })
    if (alreadyFriends) return res.status(400).json({ success: false, message: 'Already friends' })

    const request = await FriendRequest.create({ sender: req.user._id, receiver: userId })
    await request.populate('sender', 'fullName username avatar trustScore trustLevel')

    const notif = await Notification.create({
      recipient: userId,
      type: 'friend_request',
      title: 'Friend Request',
      body: `${req.user.fullName} sent you a friend request`,
      actor: req.user._id,
      data: { requestId: request._id },
    })

    emitToUser(userId, 'friend_request', { request, notification: notif })

    res.json({ success: true, message: 'Friend request sent', request })
  } catch (err) { next(err) }
}

export const acceptRequest = async (req, res, next) => {
  try {
    const { userId } = req.params
    const request = await FriendRequest.findOne({
      sender: userId,
      receiver: req.user._id,
      status: 'pending',
    })
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' })

    request.status = 'accepted'
    await request.save()

    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: userId } }),
      User.findByIdAndUpdate(userId, { $addToSet: { friends: req.user._id } }),
    ])

    const notif = await Notification.create({
      recipient: userId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${req.user.fullName} accepted your friend request`,
      actor: req.user._id,
    })

    emitToUser(userId, 'friend_accepted', { userId: req.user._id, notification: notif })

    res.json({ success: true, message: 'Friend request accepted' })
  } catch (err) { next(err) }
}

export const rejectRequest = async (req, res, next) => {
  try {
    const { userId } = req.params
    await FriendRequest.findOneAndUpdate(
      { sender: userId, receiver: req.user._id, status: 'pending' },
      { status: 'rejected' }
    )
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const cancelRequest = async (req, res, next) => {
  try {
    const { userId } = req.params
    const deleted = await FriendRequest.findOneAndDelete({
      sender: req.user._id,
      receiver: userId,
      status: 'pending',
    })
    if (!deleted) return res.status(404).json({ success: false, message: 'Request not found' })
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const removeFriend = async (req, res, next) => {
  try {
    const { userId } = req.params
    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { $pull: { friends: userId } }),
      User.findByIdAndUpdate(userId, { $pull: { friends: req.user._id } }),
    ])
    await FriendRequest.deleteOne({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id },
      ],
    })
    res.json({ success: true })
  } catch (err) { next(err) }
}

export const blockUser = async (req, res, next) => {
  try {
    const { userId } = req.params
    await Promise.all([
      User.findByIdAndUpdate(req.user._id, {
        $addToSet: { blockedUsers: userId },
        $pull: { friends: userId },
      }),
      User.findByIdAndUpdate(userId, { $pull: { friends: req.user._id } }),
      FriendRequest.deleteMany({
        $or: [
          { sender: req.user._id, receiver: userId },
          { sender: userId, receiver: req.user._id },
        ],
      }),
    ])
    res.json({ success: true, message: 'User blocked' })
  } catch (err) { next(err) }
}

export const getOnlineFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends', 'fullName username avatar isOnline lastSeen trustScore')
    const onlineFriends = (user.friends || []).filter((f) => f.isOnline)
    res.json({ success: true, friends: onlineFriends })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getFriendshipStatus = async (req, res) => {
  try {
    const { userId } = req.params

    const currentUser = await User.findById(req.user._id)
      .select('friends blockedUsers')

    // FriendRequest table se check karo
    const sentRequest = await FriendRequest.findOne({
      sender: req.user._id,
      receiver: userId,
      status: 'pending',
    })
    const receivedRequest = await FriendRequest.findOne({
      sender: userId,
      receiver: req.user._id,
      status: 'pending',
    })

    let status = 'none'
    if (currentUser.friends?.map((id) => id.toString()).includes(userId)) status = 'friends'
    else if (sentRequest) status = 'pending_sent'
    else if (receivedRequest) status = 'pending_received'
    else if (currentUser.blockedUsers?.map((id) => id.toString()).includes(userId)) status = 'blocked'

    res.json({ success: true, status })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}