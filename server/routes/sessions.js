const express = require('express')
const router = express.Router()
const Session = require('../models/Session')
const User = require('../models/User')
const { protect } = require('../middleware/auth')
const { checkAchievements } = require('../utils/achievements')


// CREATE session
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, duration, isPublic, tags } = req.body
    const session = await Session.create({
      host: req.user._id,
      title, description, duration, isPublic, tags,
      participants: [{ user: req.user._id }]
    })
    res.status(201).json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET all live sessions
router.get('/live', async (req, res) => {
  try {
    const sessions = await Session.find({ isLive: true, isPublic: true })
      .populate('host', 'username avatar')
      .populate('participants.user', 'username avatar')
      .sort({ startedAt: -1 })
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET my session history
router.get('/me/history', protect, async (req, res) => {
  try {
    const sessions = await Session.find({
      'participants.user': req.user._id,
      isLive: false
    }).sort({ endedAt: -1 }).limit(20)
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET session history
router.get('/history', protect, async (req, res) => {
  try {
    console.log('fetching history for:', req.user._id)
    const sessions = await Session.find({
      'participants.user': req.user._id,
      isLive: false
    }).sort({ createdAt: -1 }).limit(100)
    console.log('sessions found:', sessions.length)
    res.json(sessions)
  } catch (err) {
    console.log('history error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET single session
router.get('/:id', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('host', 'username avatar')
      .populate('participants.user', 'username avatar')
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// END session
router.patch('/:id/end', protect, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, host: req.user._id })
    if (!session) return res.status(404).json({ error: 'Session not found' })

    session.isLive = false
    session.endedAt = new Date()
    session.actualDuration = Math.round((session.endedAt - session.startedAt) / 60000)

    await session.save()
    await checkAchievements(req.user._id)

    // update user total focus minutes
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalFocusMinutes: session.actualDuration }
    })

    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})



router.post('/:id/join', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
module.exports = router