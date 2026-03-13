const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const http = require('http')
const { Server } = require('socket.io')
require('dotenv').config()


const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  }
})

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }))
app.use(express.json())
app.use(cookieParser())

// Routes
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/users')
const goalRoutes = require('./routes/goals')
const sessionRoutes = require('./routes/sessions')
const feedRoutes = require('./routes/feed')
const notificationRoutes = require('./routes/notifications')
const leaderboardRoutes = require('./routes/leaderboard')
const messageRoutes = require('./routes/messages')
const livestreamRoutes = require('./routes/livestream')
const monetizationRoutes = require('./routes/monetization')
const subscriptionPlansRoutes = require('./routes/subscriptionPlans')
const settingsRoutes = require('./routes/settings')


app.get('/', (req, res) => res.json({ message: '⚡ FlowSpace API is running!' }))
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/goals', goalRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/feed', feedRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/messages', messageRoutes)
app.set('io', io)
app.use('/api/livestream', livestreamRoutes)
app.use('/api/monetization', monetizationRoutes)
app.use('/api/plans', subscriptionPlansRoutes)
app.use('/api/settings', settingsRoutes)



// Socket.io
const jwt = require('jsonwebtoken')
const User = require('./models/User')
const Session = require('./models/Session')

// online users map: userId -> socketId
const onlineUsers = new Map()

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('No token'))
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    socket.userId = decoded.id
    next()
  } catch (err) {
    next(new Error('Invalid token'))
  }
})

io.on('connection', async (socket) => {
  console.log('⚡ User connected:', socket.userId)

  // store online user
  onlineUsers.set(socket.userId, socket.id)
  await User.findByIdAndUpdate(socket.userId, { isOnline: true })

  // JOIN focus room
  socket.on('join:room', async ({ sessionId }) => {
    socket.join(sessionId)
    const session = await Session.findById(sessionId)
      .populate('participants.user', 'username avatar')
      .populate('host', 'username avatar')
    io.to(sessionId).emit('room:updated', {
      participants: session.participants,
      count: session.participants.length
    })
    console.log(`👥 ${socket.userId} joined room ${sessionId}`)
  })
  socket.on('dm:delete', ({ conversationId, messageId }) => {
    io.to(`dm:${conversationId}`).emit('dm:deleted', { messageId })
  })
  // LEAVE focus room
  socket.on('leave:room', async ({ sessionId }) => {
    socket.leave(sessionId)
    io.to(sessionId).emit('room:updated', { message: 'A user left' })
  })

  // TIMER start
  socket.on('timer:start', ({ sessionId, duration }) => {
    let remaining = duration * 60
    const intervalId = setInterval(() => {
      remaining--
      io.to(sessionId).emit('timer:tick', { remaining })
      if (remaining <= 0) {
        clearInterval(intervalId)
        io.to(sessionId).emit('timer:done', { phase: 'work' })
      }
    }, 1000)
    socket.timerInterval = intervalId
  })

  // TIMER pause
  socket.on('timer:pause', () => {
    if (socket.timerInterval) clearInterval(socket.timerInterval)
  })

  // CHAT message
  socket.on('chat:message', async ({ sessionId, text }) => {
    const user = await User.findById(socket.userId).select('username avatar')
    io.to(sessionId).emit('chat:new', {
      user: { username: user.username, avatar: user.avatar },
      text,
      timestamp: new Date()
    })
  })

  // DISCONNECT
  socket.on('disconnect', async () => {
    // wait 10 seconds before ending stream in case host reconnects
    setTimeout(async () => {
      const LiveStream = require('./models/LiveStream')
      const activeStream = await LiveStream.findOne({
        host: socket.userId,
        isLive: true
      })
      if (activeStream) {
        activeStream.isLive = false
        activeStream.endedAt = new Date()
        await activeStream.save()
        io.to(`stream:${activeStream._id}`).emit('stream:ended', {
          message: 'Host has left the stream'
        })
      }
    }, 30000) // 30 second grace period
  })
  // DM events
  socket.on('dm:join', (conversationId) => {
    socket.join(`dm:${conversationId}`)
  })

  socket.on('dm:leave', (conversationId) => {
    socket.leave(`dm:${conversationId}`)
  })

  socket.on('dm:send', async (data) => {
    try {
      const { conversationId, text, replyTo } = data
      const Message = require('./models/Message')
      const Conversation = require('./models/Conversation')

      const message = await Message.create({
        conversation: conversationId,
        sender: socket.userId,
        text,
        replyTo: replyTo || null
      })

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        lastMessageText: text,
        lastMessageAt: new Date()
      })

      const populated = await message.populate('sender', 'username avatar')
      io.to(`dm:${conversationId}`).emit('dm:message', populated)
    } catch (err) {
      console.log('dm:send error:', err.message)
    }
  })

  // LIVE STREAM - WebRTC signaling
  socket.on('stream:join', async ({ streamId }) => {
    socket.join(`stream:${streamId}`)
    const LiveStream = require('./models/LiveStream')
    const stream = await LiveStream.findById(streamId)

    // don't count host as viewer
    const isHost = stream?.host?.toString() === socket.userId?.toString()
    if (!isHost) {
      await LiveStream.findByIdAndUpdate(streamId, {
        $addToSet: { viewers: socket.userId },
        $inc: { viewerCount: 1 }
      })
    }

    const user = await User.findById(socket.userId).select('username avatar')
    io.to(`stream:${streamId}`).emit('stream:viewer_joined', {
      userId: socket.userId,
      username: user.username,
      avatar: user.avatar,
      viewerCount: await LiveStream.findById(streamId).then(s => s?.viewerCount || 0)
    })
  })

  socket.on('stream:leave', async ({ streamId }) => {
    socket.leave(`stream:${streamId}`)
    const LiveStream = require('./models/LiveStream')
    await LiveStream.findByIdAndUpdate(streamId, {
      $pull: { viewers: socket.userId },
    })
    const stream = await LiveStream.findById(streamId)
    const newCount = Math.max(0, stream?.viewerCount - 1 || 0)
    await LiveStream.findByIdAndUpdate(streamId, { viewerCount: newCount })
    io.to(`stream:${streamId}`).emit('stream:viewer_left', {
      userId: socket.userId,
      viewerCount: newCount
    })
  })

  socket.on('stream:chat', async ({ streamId, text }) => {
    const user = await User.findById(socket.userId).select('username avatar')
    const message = {
      user: socket.userId,
      username: user.username,
      avatar: user.avatar,
      text,
      type: 'message',
      createdAt: new Date()
    }
    // emit FIRST for speed
    io.to(`stream:${streamId}`).emit('stream:message', message)
    // then save to DB
    const LiveStream = require('./models/LiveStream')
    await LiveStream.findByIdAndUpdate(streamId, { $push: { messages: message } })
  })

  socket.on('stream:like', async ({ streamId }) => {
    const LiveStream = require('./models/LiveStream')
    const stream = await LiveStream.findById(streamId)
    const isLiked = stream.likes.includes(socket.userId)
    if (isLiked) {
      await LiveStream.findByIdAndUpdate(streamId, { $pull: { likes: socket.userId } })
    } else {
      await LiveStream.findByIdAndUpdate(streamId, { $addToSet: { likes: socket.userId } })
    }
    io.to(`stream:${streamId}`).emit('stream:likes', {
      count: stream.likes.length + (isLiked ? -1 : 1),
      isLiked: !isLiked,
      userId: socket.userId
    })
  })

  socket.on('stream:donation', ({ streamId, donation }) => {
    io.to(`stream:${streamId}`).emit('stream:donation_received', donation)
  })

  // WebRTC signaling
  socket.on('webrtc:offer', ({ streamId, offer, viewerId }) => {
    socket.to(`stream:${streamId}`).emit('webrtc:offer', { offer, viewerId })
  })

  socket.on('webrtc:answer', ({ streamId, answer, hostId }) => {
    socket.to(`stream:${streamId}`).emit('webrtc:answer', { answer })
  })

  socket.on('webrtc:ice', ({ streamId, candidate, targetId }) => {
    socket.to(`stream:${streamId}`).emit('webrtc:ice', { candidate })
  })

  socket.on('stream:host_ready', ({ streamId }) => {
    socket.to(`stream:${streamId}`).emit('stream:host_ready')
  })
})

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB error:', err))

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`))

// DM events

