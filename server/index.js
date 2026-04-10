if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '.env') })
}
console.log('ENV CHECK:', {
  mongo: process.env.MONGODB_URI?.slice(0, 20),
  jwt: process.env.JWT_ACCESS_SECRET?.slice(0, 5),
  razorpay: process.env.RAZORPAY_KEY_ID?.slice(0, 10)
})
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const http = require('http')
const { Server } = require('socket.io')


const app = express()
const httpServer = http.createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'https://flowspace-one.vercel.app', 'https://adminfs-one.vercel.app'],
    credentials: true
  }
})

app.use(cors({ origin: ['http://localhost:3001', 'http://localhost:5174', 'http://localhost:5173', 'https://flowspace-one.vercel.app', 'https://adminfs-one.vercel.app'], credentials: true }))
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
const adminRoutes = require('./routes/admin')
const handleStreamSockets = require('./socket/streamSocket')



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
app.use('/api/admin', adminRoutes)

handleStreamSockets(io)


// Socket.io
const jwt = require('jsonwebtoken')
const User = require('./models/User')
const Session = require('./models/Session')
const NodeMediaServer = require('node-media-server')
const LiveStream = require('./models/LiveStream')


const nmsConfig = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media'
  },
  trans: {
    ffmpeg: 'C:\\ffmpeg\\bin\\ffmpeg.exe',
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: false
      }
    ]
  }
}
if (process.env.NODE_ENV !== 'production') {
  const nms = new NodeMediaServer(nmsConfig)
  nms.run()
}

// verify stream key on publish
if (process.env.NODE_ENV !== 'production') {
nms.on('prePublish', async (id, StreamPath, args) => {
  try {
    // StreamPath format: /live/STREAMKEY
    const parts = (StreamPath || '').split('/')
    const streamKey = parts[parts.length - 1]
    console.log('Stream key:', streamKey)

    const user = await User.findOne({ streamKey })
    console.log('User found:', user?.username)

    if (!user) {
      console.log('No user — rejecting')
      const session = nms.getSession(id)
      session.reject()
      return
    }

    await LiveStream.findOneAndUpdate(
      { streamKey },
      {
        host: user._id,
        title: `${user.username}'s Stream`,
        streamKey,
        isLive: true,
        lastHeartbeat: new Date()
      },
      { upsert: true, new: true }
    )
    console.log(' Stream created for', user.username)
  } catch (err) {
    console.log('prePublish error:', err.message)
  }
})

nms.on('donePublish', async (id, StreamPath, args) => {
  const streamKey = StreamPath.split('/')[2]
  await LiveStream.findOneAndUpdate(
    { streamKey },
    { isLive: false, endedAt: new Date() }
  )
  console.log('Stream ended:', streamKey)
})
}
// online users map: userId -> socketId
const onlineUsers = new Map()

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    const user = await User.findById(decoded.id).select('username avatar _id')
    if (!user) return next(new Error('User not found'))
    socket.user = user                      // full user object
    // string ID
    next()
  } catch (err) {
    next(new Error('Invalid token'))
  }
})
io.on('connection', async (socket) => {
  console.log(' User connected:', socket.user?._id)

  // store online user
  onlineUsers.set(socket.user?._id, socket.id)
  await User.findByIdAndUpdate(socket.user?._id, { isOnline: true })

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
    console.log(`👥 ${socket.user?._id} joined room ${sessionId}`)
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
  // socket.on('stream:chat', async ({ streamId, text }) => {
  //   console.log('💬 stream:chat received from', socket.user?.username, 'text:', text, 'streamId:', streamId)
  //   console.log('socket.user:', socket.user)
  //   if (!text?.trim()) return
  //   const user = socket.user  // ← use socket.user not socket.user?._id
  //   if (!user) return
  //   const message = {
  //     user: user._id,
  //     username: user.username,
  //     avatar: user.avatar,
  //     text,
  //     type: 'message',
  //     createdAt: new Date(),
  //     _id: Date.now().toString()
  //   }
  //   // emit first for speed
  //   io.to(`stream:${streamId}`).emit('stream:message', message)
  //   // save to DB
  //   const LiveStream = require('./models/LiveStream')
  //   await LiveStream.findByIdAndUpdate(streamId, { $push: { messages: message } })
  // })

  // DISCONNECT
  socket.on('disconnect', async () => {
    try {
      const LiveStream = require('./models/LiveStream')
      const activeStream = await LiveStream.findOne({
        host: socket.user?._id,
        isLive: true
      })
      if (activeStream) {
        activeStream.isLive = false
        activeStream.endedAt = new Date()
        await activeStream.save()
        io.to(`stream:${activeStream._id.toString()}`).emit('stream:ended', {
          message: 'Host has ended the stream'
        })
      }
    } catch (err) { console.log(err) }
  })
  socket.on('stream:end', async ({ streamId }) => {
    const stream = await LiveStream.findById(streamId)
    if (!stream) return
    if (stream.host.toString() !== socket.userId) return

    const duration = stream.createdAt
      ? Math.floor((new Date() - new Date(stream.createdAt)) / 1000)
      : 0

    const avgViewers = stream.uniqueViewers?.length
      ? Math.floor(stream.uniqueViewers.length / 2)
      : 0

    stream.isLive = false
    stream.endedAt = new Date()
    stream.duration = duration
    stream.avgViewers = avgViewers
    await stream.save()

    io.to(`stream:${streamId}`).emit('stream:ended', {
      message: 'Host has ended the stream'
    })
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
        sender: socket.user?._id,
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
    const rooms = Array.from(socket.rooms)
    if (rooms.includes(`stream:${streamId}`)) return

    socket.join(`stream:${streamId}`)
    const LiveStream = require('./models/LiveStream')
    const stream = await LiveStream.findById(streamId)
    if (!stream) return

    const isHost = stream?.host?.toString() === socket.userId

    if (!isHost) {
      const updated = await LiveStream.findByIdAndUpdate(streamId, {
        $addToSet: { viewers: socket.userId, uniqueViewers: socket.userId },
        $inc: { viewerCount: 1 }
      }, { new: true })

      // update peak viewers
      if (updated && updated.viewerCount > (updated.peakViewers || 0)) {
        await LiveStream.findByIdAndUpdate(streamId, {
          peakViewers: updated.viewerCount
        })
      }

      io.to(`stream:${streamId}`).emit('stream:viewer_joined', {
        userId: socket.userId,
        username: socket.user.username,
        avatar: socket.user.avatar,
        viewerCount: updated.viewerCount
      })
    }
  


  io.to(`stream:${streamId}`).emit('stream:viewer_joined', {
    userId: socket.userId,
    username: socket.user.username,
    avatar: socket.user.avatar,
    viewerCount: await LiveStream.findById(streamId).then(s => s?.viewerCount || 0)
  })

  // host announces they are ready
  socket.on('stream:host_join', ({ streamId }) => {
    socket.join(`stream:${streamId}`)
    socket.to(`stream:${streamId}`).emit('stream:host_ready')
    console.log('✅ Host joined stream room:', streamId)
  })

  // viewer requests offer from host
  socket.on('stream:request_offer', ({ streamId }) => {
    console.log('👀 Viewer requesting offer for stream:', streamId)
    // tell host to send an offer to this specific viewer
    const viewerId = socket.userId || socket.id
    socket.to(`stream:${streamId}`).emit('stream:viewer_wants_offer', {
      viewerId
    })
  })

})

socket.on('stream:leave', async ({ streamId }) => {
  socket.leave(`stream:${streamId}`)
  const LiveStream = require('./models/LiveStream')
  await LiveStream.findByIdAndUpdate(streamId, {
    $pull: { viewers: socket.user?._id },
  })
  const stream = await LiveStream.findById(streamId)
  const newCount = Math.max(0, stream?.viewerCount - 1 || 0)
  await LiveStream.findByIdAndUpdate(streamId, { viewerCount: newCount })
  io.to(`stream:${streamId}`).emit('stream:viewer_left', {
    userId: socket.user?._id,
    viewerCount: newCount
  })
})

socket.on('stream:chat', async ({ streamId, text }) => {
  const user = await User.findById(socket.user?._id).select('username avatar')
  const message = {
    user: socket.user?._id,
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

  await LiveStream.findByIdAndUpdate(streamId, {
    $inc: { chatCount: 1 },
    $push: { messages: message }
  })
})

socket.on('stream:like', async ({ streamId }) => {
  const LiveStream = require('./models/LiveStream')
  const stream = await LiveStream.findById(streamId)
  const isLiked = stream.likes.includes(socket.user?._id)
  if (isLiked) {
    await LiveStream.findByIdAndUpdate(streamId, { $pull: { likes: socket.user?._id } })
  } else {
    await LiveStream.findByIdAndUpdate(streamId, { $addToSet: { likes: socket.user?._id } })
  }
  io.to(`stream:${streamId}`).emit('stream:likes', {
    count: stream.likes.length + (isLiked ? -1 : 1),
    isLiked: !isLiked,
    userId: socket.user?._id
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
  console.log('📨 Answer received, routing to stream room:', streamId)
  socket.to(`stream:${streamId}`).emit('webrtc:answer', { answer, viewerId: socket.userId || socket.id })
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

