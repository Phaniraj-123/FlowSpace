const express = require('express')
const router = express.Router()
const Notification = require('../models/Notification')
const { protect } = require('../middleware/auth')

// GET all notifications
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ to: req.user._id })
      .populate('from', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(30)
    res.json(notifications)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET unread count
router.get('/unread', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      to: req.user._id, isRead: false
    })
    res.json({ count })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// MARK all as read
router.patch('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { to: req.user._id, isRead: false },
      { isRead: true }
    )
    res.json({ message: 'All marked as read' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// MARK one as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true })
    res.json({ message: 'Marked as read' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/clear-all', protect, async (req, res) => {
  try {
    await Notification.deleteMany({ to: req.user._id })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
module.exports = router