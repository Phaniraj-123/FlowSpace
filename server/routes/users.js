const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { protect } = require('../middleware/auth')
const Goal = require('../models/Goal')
const Session = require('../models/Session')
const { createNotification } = require('../utils/notify')
const upload = require('../middleware/upload')
const { uploadToCloudinary } = require('../utils/cloudinary')

// ✅ SPECIFIC routes FIRST

// GET me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// UPDATE profile
router.put('/me/profile', protect, upload.single('avatar'), async (req, res) => {
  try {
    let avatarUrl = ''
    if (req.file) {
      avatarUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype)
    }
    const updates = {}
    if (req.body.bio !== undefined) updates.bio = req.body.bio
    if (avatarUrl) updates.avatar = avatarUrl
    const user = await User.findByIdAndUpdate(
      req.user._id, updates, { new: true }
    ).select('-password')
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET my stats
router.get('/me/stats', protect, async (req, res) => {
  try {
    const [goalsCount, completedGoals, sessionsCount, user] = await Promise.all([
      Goal.countDocuments({ owner: req.user._id }),
      Goal.countDocuments({ owner: req.user._id, status: 'completed' }),
      Session.countDocuments({ 'participants.user': req.user._id, isLive: false }),
      User.findById(req.user._id)
        .populate('followers', 'username avatar bio')
        .populate('following', 'username avatar bio')
        .select('totalFocusMinutes streak followers following username email')
    ])
    res.json({
      goalsCount, completedGoals, sessionsCount,
      totalFocusMinutes: user.totalFocusMinutes,
      totalFocusHours: Math.round(user.totalFocusMinutes / 60 * 10) / 10,
      streak: user.streak,
      followers: user.followers,
      following: user.following,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      username: user.username,
      email: user.email
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET suggestions
router.get('/me/suggestions', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id)
    const users = await User.find({
      _id: { $ne: req.user._id, $nin: currentUser.following }
    }).select('username avatar bio followers').limit(5)
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// SEARCH users
router.get('/search/:query', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id)
    const users = await User.find({
      username: { $regex: req.params.query, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('username avatar bio followers subscriptionTier').limit(10)

    const usersWithFollowStatus = users.map(u => ({
      ...u.toObject(),
      isFollowing: currentUser.following.map(f => f.toString()).includes(u._id.toString())
    }))

    // search posts too
    const Post = require('../models/post')
    const posts = await Post.find({
      content: { $regex: req.params.query, $options: 'i' }
    })
      .populate('author', 'username avatar subscriptionTier')
      .sort({ createdAt: -1 })
      .limit(10)

    res.json({ users: usersWithFollowStatus, posts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// FOLLOW user
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ error: 'Cannot follow yourself' })
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: req.params.id } })
    await User.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.user._id } })
    await createNotification(
      req.params.id, req.user._id,
      'follow', `${req.user.username} started following you`,
      `/user/${req.user.username}`
    )
    res.json({ message: 'Followed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// UNFOLLOW user
router.delete('/:id/follow', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } })
    await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } })
    res.json({ message: 'Unfollowed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

//get stream key
router.get('/me/stream-key', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user.streamKey) {
      user.streamKey = require('crypto').randomBytes(16).toString('hex')
      await User.findByIdAndUpdate(req.user._id, { streamKey: user.streamKey })
    }
    res.json({ streamKey: user.streamKey })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// REGENERATE stream key
router.post('/me/stream-key/regenerate', protect, async (req, res) => {
  try {
    const newKey = require('crypto').randomBytes(16).toString('hex')
    await User.findByIdAndUpdate(req.user._id, { streamKey: newKey })
    res.json({ streamKey: newKey })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})



// ✅ DYNAMIC route LAST
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username avatar bio subscriptionTier')
      .populate('following', 'username avatar bio subscriptionTier')
      .select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router