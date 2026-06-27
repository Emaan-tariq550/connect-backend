import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import connectDB from './config/db.js'
import { initSocket } from './socket/socketManager.js'
import { errorHandler } from './middleware/errorHandler.js'
import { generalLimiter } from './middleware/rateLimiter.js'

// Routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import friendRoutes from './routes/friends.js'
import chatRoutes from './routes/chats.js'
import messageRoutes from './routes/messages.js'
import communityRoutes from './routes/communities.js'
import channelRoutes from './routes/channels.js'
import notificationRoutes from './routes/notifications.js'
import trustRoutes from './routes/trust.js'
import adminRoutes from './routes/admin.js'
import postRoutes from './routes/post.js'



const app = express()
const httpServer = http.createServer(app)

// Connect DB
connectDB()

// Init Socket.IO
initSocket(httpServer)

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}))

// Middleware
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
app.use(generalLimiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'CONNECT by Emaan' })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/friends', friendRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/communities', communityRoutes)
app.use('/api/channels', channelRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/trust', trustRoutes)
app.use('/api/admin', adminRoutes)
// existing routes ke saath add karo
app.use('/api/posts', postRoutes)

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
})

// Error handler
app.use(errorHandler)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`🚀 CONNECT Backend running on port ${PORT}`)
  console.log(`🌐 Client: ${process.env.CLIENT_URL}`)
  console.log(`📡 Socket.IO ready`)
})