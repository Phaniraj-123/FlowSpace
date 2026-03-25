const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Post = require('../models/post')
const LiveStream = require('../models/LiveStream')
const Wallet = require('../models/Wallet')
const { protect } = require('../middleware/auth')

function adminOnly(req, res, next) {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin only' })
  next()
}

router.get('/analytics', protect, adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalPosts, totalStreams, activeStreams, bannedUsers, premiumUsers] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      LiveStream.countDocuments(),
      LiveStream.countDocuments({ isLive: true }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ subscriptionTier: { $ne: null } })
    ])
    const wallets = await Wallet.find()
    const totalRevenue = wallets.reduce((sum, w) => sum + (w.totalEarned || 0), 0)
    res.json({ totalUsers, totalPosts, totalStreams, activeStreams, bannedUsers, premiumUsers, totalRevenue })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password -refreshToken').sort({ createdAt: -1 }).limit(100)
    res.json(users)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/posts', protect, adminOnly, async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'username avatar').sort({ createdAt: -1 }).limit(100)
    res.json(posts)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/streams', protect, adminOnly, async (req, res) => {
  try {
    const streams = await LiveStream.find().populate('host', 'username avatar').sort({ createdAt: -1 }).limit(50)
    res.json(streams)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/transactions', protect, adminOnly, async (req, res) => {
  try {
    const wallets = await Wallet.find().populate('user', 'username avatar')
    const transactions = wallets.flatMap(w =>
      (w.transactions || []).map(t => ({ ...t.toObject(), user: w.user }))
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 100)
    res.json(transactions)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id)
    await Post.deleteMany({ author: req.params.id })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/posts/:id', protect, adminOnly, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/users/:id/ban', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    user.isBanned = !user.isBanned
    await user.save()
    res.json({ success: true, isBanned: user.isBanned })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/users/:id/tier', protect, adminOnly, async (req, res) => {
  try {
    const { tier } = req.body
    await User.findByIdAndUpdate(req.params.id, { subscriptionTier: tier || null })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/streams/:id/end', protect, adminOnly, async (req, res) => {
  try {
    await LiveStream.findByIdAndUpdate(req.params.id, { isLive: false, endedAt: new Date() })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.patch('/users/:id/admin', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    user.isAdmin = !user.isAdmin
    await user.save()
    res.json({ success: true, isAdmin: user.isAdmin })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router