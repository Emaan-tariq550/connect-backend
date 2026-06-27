import { Server } from 'socket.io'
import { verifyAccessToken } from '../utils/generateToken.js'
import User from '../models/User.js'
import { registerChatSocket } from './chatSocket.js'
import { registerCallSocket } from './callSocket.js'
import { registerCommunitySocket } from './communitySocket.js'

let io = null

export const getIO = () => io

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('Authentication required'))
      const decoded = verifyAccessToken(token)
      const user = await User.findById(decoded.id).select('fullName username avatar trustScore trustLevel isAdmin isBanned')
      if (!user || user.isBanned) return next(new Error('Unauthorized'))
      socket.user = user
      next()
    } catch (err) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString()

    // Join personal room
    socket.join(`user_${userId}`)

    // Mark online
    await User.findByIdAndUpdate(userId, { isOnline: true, socketId: socket.id, lastSeen: new Date() })
    socket.broadcast.emit('user_online', { userId })

    // Send online users list
    const onlineUsers = await User.find({ isOnline: true }).select('_id')
    socket.emit('online_users', { userIds: onlineUsers.map(u => u._id.toString()) })

    // Register all socket handlers
    registerChatSocket(io, socket)
    registerCallSocket(io, socket)
    registerCommunitySocket(io, socket)

    socket.on('go_online', async () => {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() })
      socket.broadcast.emit('user_online', { userId })
    })

    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date(), socketId: '' })
      socket.broadcast.emit('user_offline', { userId })
    })
  })

  console.log('✅ Socket.IO initialized')
  return io
}