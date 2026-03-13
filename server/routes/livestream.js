const express = require('express')
const router = express.Router()
const LiveStream = require('../models/LiveStream')
const Wallet = require('../models/Wallet')
const User = require('../models/User')
const { protect } = require('../middleware/auth')
const upload = require('../middleware/upload')
const { uploadToCloudinary } = require('../utils/cloudinary')

// GET all live streams
router.get('/', async (req, res) => {
  try {
    const streams = await LiveStream.find({ isLive: true })
      .populate('host', 'username avatar')
      .sort({ viewerCount: -1 })
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

module.exports = router