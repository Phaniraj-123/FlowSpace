const express = require('express')
const router = express.Router()
const User = require('../models/User')
const Achievement = require('../models/Achievement')
const Goal = require('../models/Goal')
const Session = require('../models/Session')
const { protect } = require('../middleware/auth')

// GET leaderboard
router.get('/', protect, async (req, res) => {
  try {
    const type = req.query.type || 'focus'

    let users = await User.find({}).select('username totalFocusMinutes followers streak')

    if (type === 'focus') {
      users = users.sort((a, b) => (b.totalFocusMinutes || 0) - (a.totalFocusMinutes || 0))
    } else if (type === 'followers') {
      users = users.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0))
    } else if (type === 'streak') {
      users = users.sort((a, b) => (b.streak?.current || 0) - (a.streak?.current || 0))
    }

    const top = users.slice(0, 20).map((u, i) => ({
      rank: i + 1,
      _id: u._id,
      username: u.username,
      totalFocusMinutes: u.totalFocusMinutes || 0,
      totalFocusHours: Math.round((u.totalFocusMinutes || 0) / 60 * 10) / 10,
      followersCount: u.followers?.length || 0,
      streak: u.streak?.current || 0
    }))

    res.json(top)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET my achievements
router.get('/achievements', protect, async (req, res) => {
  try {
    const { checkAchievements, ACHIEVEMENTS } = require('../utils/achievements')
    await checkAchievements(req.user._id)
    const unlocked = await Achievement.find({ user: req.user._id }).sort({ unlockedAt: -1 })
    const unlockedTypes = new Set(unlocked.map(a => a.type))

    // return all achievements with locked/unlocked status
    const all = ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlockedTypes.has(a.type),
      unlockedAt: unlocked.find(u => u.type === a.type)?.unlockedAt
    }))

    res.json({ unlocked: unlocked.length, total: ACHIEVEMENTS.length, achievements: all })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router