const express = require('express')
const router = express.Router()
const LiveStream = require('../models/LiveStream')
const Wallet = require('../models/Wallet')
const User = require('../models/User')
const { protect } = require('../middleware/auth')
const upload = require('../middleware/upload')
const { uploadToCloudinary } = require('../utils/cloudinary')
streamKey: { type: String }

// GET all live streams
// replace your existing GET / route with this:
router.get('/', async (req, res) => {
  try {
    const { search, category, sort } = req.query

    let query = { isLive: true }

    // search by title or host username
    if (search) {
      const matchingUsers = await User.find({
        username: { $regex: search, $options: 'i' }
      }).select('_id')
      const userIds = matchingUsers.map(u => u._id)

      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { host: { $in: userIds } }
      ]
    }

    // filter by category
    if (category && category !== 'all') {
      query.category = category
    }

    // sort
    let sortQuery = { viewerCount: -1 } // default: most viewers
    if (sort === 'newest') sortQuery = { createdAt: -1 }
    if (sort === 'oldest') sortQuery = { createdAt: 1 }

    const streams = await LiveStream.find(query)
      .populate('host', 'username avatar')
      .sort(sortQuery)

    res.json(streams)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single stream
router.get('/:id', async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id)
      .populate('host', 'username avatar')
      .populate('messages.user', 'username avatar')
    if (!stream) return res.status(404).json({ error: 'Stream not found' })
    res.json(stream)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// START stream
router.post('/start', protect, upload.single('thumbnail'), async (req, res) => {
  try {
    // end any existing stream by this host
    await LiveStream.updateMany({ host: req.user._id, isLive: true }, { isLive: false })

    let thumbnail = ''
    if (req.file) {
      thumbnail = await uploadToCloudinary(req.file.buffer, req.file.mimetype)
    }

    const stream = await LiveStream.create({
      host: req.user._id,
      title: req.body.title || 'Live Stream',
      description: req.body.description || '',
      thumbnail
    })

    if (req.body.isPPV === 'true') {
      stream.isPPV = true
      stream.ppvPrice = Number(req.body.ppvPrice) || 50
      await stream.save()
    }
    // ensure wallet exists
    await Wallet.findOneAndUpdate(
      { user: req.user._id },
      { $setOnInsert: { user: req.user._id } },
      { upsert: true, new: true }
    )

    const populated = await stream.populate('host', 'username avatar')
    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// nginx calls this on RTMP connect — validates stream key
router.post('/auth', async (req, res) => {
  try {
    const { name: streamKey } = req.body
    const user = await User.findOne({ streamKey })
    if (!user) return res.status(403).send('Forbidden')
    if (user.isBanned) return res.status(403).send('Banned')

    await LiveStream.findOneAndUpdate(
      { host: user._id, isLive: true },
      { streamKey, viewerCount: 0 },
      { upsert: false }
    )
    res.status(200).send('OK')
  } catch (err) {
    res.status(500).send('Error')
  }
})

// nginx calls this when stream disconnects
router.post('/auth/end', async (req, res) => {
  try {
    const { name: streamKey } = req.body
    const user = await User.findOne({ streamKey })
    if (user) {
      await LiveStream.findOneAndUpdate(
        { host: user._id, isLive: true },
        { isLive: false, endedAt: new Date() }
      )
    }
    res.status(200).send('OK')
  } catch (err) {
    res.status(500).send('Error')
  }
})

// LIKE toggle
router.post('/:id/like', protect, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id)
    if (!stream) return res.status(404).json({ error: 'Not found' })
    const liked = stream.likes.includes(req.user._id)
    if (liked) {
      stream.likes.pull(req.user._id)
    } else {
      stream.likes.push(req.user._id)
    }
    await stream.save()
    res.json({ count: stream.likes.length, isLiked: !liked, userId: req.user._id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// END stream
router.post('/:id/end', protect, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id)
    if (!stream) return res.status(404).json({ error: 'Stream not found' })
    if (stream.host.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not your stream' })
    stream.isLive = false
    stream.endedAt = new Date()
    await stream.save()
    res.json({ message: 'Stream ended' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// TEMP: clean up dead streams
router.post('/cleanup', async (req, res) => {
  try {
    const result = await LiveStream.updateMany(
      { isLive: true },
      { isLive: false, endedAt: new Date() }
    )
    res.json({ cleaned: result.modifiedCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DONATE coins
router.post('/:id/donate', protect, async (req, res) => {
  try {
    const { amount, message } = req.body
    if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' })

    const stream = await LiveStream.findById(req.params.id).populate('host', 'username avatar')
    if (!stream) return res.status(404).json({ error: 'Stream not found' })

    // check sender wallet
    let senderWallet = await Wallet.findOne({ user: req.user._id })
    if (!senderWallet) {
      senderWallet = await Wallet.create({ user: req.user._id })
    }
    if (senderWallet.balance < amount)
      return res.status(400).json({ error: 'Insufficient coins' })

    // deduct from sender
    senderWallet.balance -= amount
    senderWallet.transactions.push({
      type: 'debit', amount,
      description: `Donated to ${stream.host.username}`,
      to: stream.host._id
    })
    await senderWallet.save()

    // credit to host
    let hostWallet = await Wallet.findOne({ user: stream.host._id })
    if (!hostWallet) hostWallet = await Wallet.create({ user: stream.host._id })
    hostWallet.balance += amount
    hostWallet.transactions.push({
      type: 'credit', amount,
      description: `Donation from ${req.user.username}`,
      from: req.user._id
    })
    await hostWallet.save()

    // add donation to stream
    stream.donations.push({ from: req.user._id, to: stream.host._id, amount, message })
    stream.totalDonations += amount
    await stream.save()

    res.json({
      success: true,
      newBalance: senderWallet.balance,
      donation: { amount, message, username: req.user.username }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET wallet
router.get('/wallet/me', protect, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet) wallet = await Wallet.create({ user: req.user._id })
    res.json(wallet)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// SET PPV on stream
router.post('/:id/set-ppv', protect, async (req, res) => {
  try {
    const { price } = req.body
    const stream = await LiveStream.findById(req.params.id)
    if (!stream) return res.status(404).json({ error: 'Stream not found' })
    if (stream.host.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not your stream' })
    stream.isPPV = true
    stream.ppvPrice = price || 50
    await stream.save()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PURCHASE PPV access
router.post('/:id/purchase-ppv', protect, async (req, res) => {
  try {
    const stream = await LiveStream.findById(req.params.id)
    if (!stream) return res.status(404).json({ error: 'Stream not found' })
    if (!stream.isPPV) return res.status(400).json({ error: 'Not a PPV stream' })
    if (stream.ppvBuyers?.includes(req.user._id))
      return res.json({ success: true, alreadyPurchased: true })

    let wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet || wallet.balance < stream.ppvPrice)
      return res.status(400).json({ error: 'Insufficient coins' })

    wallet.balance -= stream.ppvPrice
    wallet.totalSpent += stream.ppvPrice
    wallet.transactions.push({
      type: 'debit', amount: stream.ppvPrice,
      description: `PPV access: ${stream.title}`
    })
    await wallet.save()

    let hostWallet = await Wallet.findOne({ user: stream.host })
    if (!hostWallet) hostWallet = await Wallet.create({ user: stream.host })
    hostWallet.balance += stream.ppvPrice
    hostWallet.totalEarned += stream.ppvPrice
    hostWallet.transactions.push({
      type: 'credit', amount: stream.ppvPrice,
      description: `PPV purchase: ${stream.title}`,
      from: req.user._id
    })
    await hostWallet.save()

    stream.ppvBuyers.push(req.user._id)
    await stream.save()

    res.json({ success: true, newBalance: wallet.balance })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET stream analytics for host
router.get('/analytics/me', protect, async (req, res) => {
  try {
    const streams = await LiveStream.find({ host: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)

    // overall stats
    const totalStreams = streams.length
    const totalDuration = streams.reduce((sum, s) => sum + (s.duration || 0), 0)
    const totalViewers = streams.reduce((sum, s) => sum + (s.uniqueViewers?.length || 0), 0)
    const totalDonations = streams.reduce((sum, s) => sum + (s.totalDonations || 0), 0)
    const totalLikes = streams.reduce((sum, s) => sum + (s.likes?.length || 0), 0)
    const totalMessages = streams.reduce((sum, s) => sum + (s.chatCount || 0), 0)
    const peakViewers = Math.max(...streams.map(s => s.peakViewers || 0), 0)
    const avgDuration = totalStreams ? Math.floor(totalDuration / totalStreams) : 0

    // per stream data for chart
    const streamData = streams.slice(0, 10).reverse().map(s => ({
      _id: s._id,
      title: s.title,
      date: s.createdAt,
      viewers: s.uniqueViewers?.length || 0,
      peakViewers: s.peakViewers || 0,
      duration: s.duration || 0,
      likes: s.likes?.length || 0,
      donations: s.totalDonations || 0,
      chatCount: s.chatCount || 0,
      category: s.category,
      isLive: s.isLive
    }))

    // category breakdown
    const categoryBreakdown = streams.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1
      return acc
    }, {})

    res.json({
      overview: {
        totalStreams,
        totalDuration,
        avgDuration,
        totalViewers,
        peakViewers,
        totalDonations,
        totalLikes,
        totalMessages
      },
      streamData,
      categoryBreakdown
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router