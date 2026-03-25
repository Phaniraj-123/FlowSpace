const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { protect } = require('../middleware/auth')
const bcrypt = require('bcryptjs')

// GET settings
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('settings blockedUsers sessions')
            .populate('blockedUsers', 'username avatar')
        res.json(user)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

router.put('/profile', protect, async (req, res) => {
    try {
        const { name, username } = req.body
        if (!username) return res.status(400).json({ error: 'Username required' })
        if (username.length < 3) return res.status(400).json({ error: 'Username too short' })

        const existing = await User.findOne({ username, _id: { $ne: req.user._id } })
        if (existing) return res.status(400).json({ error: 'Username already taken' })

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { username, name } },
            { new: true }
        ).select('-password')

        res.json(updated)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// UPDATE theme
router.put('/theme', protect, async (req, res) => {
    try {
        const { theme } = req.body
        await User.findByIdAndUpdate(req.user._id, { 'settings.theme': theme })
        res.json({ success: true, theme })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// UPDATE notifications
router.put('/notifications', protect, async (req, res) => {
    try {
        const { notifications } = req.body
        await User.findByIdAndUpdate(req.user._id, {
            'settings.notifications': notifications
        })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// UPDATE privacy
router.put('/privacy', protect, async (req, res) => {
    try {
        const { privacy } = req.body
        await User.findByIdAndUpdate(req.user._id, {
            'settings.privacy': privacy
        })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// CHANGE password
router.put('/password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body
        if (!currentPassword || !newPassword)
            return res.status(400).json({ error: 'Both fields required' })
        if (newPassword.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters' })

        const user = await User.findById(req.user._id)
        const isMatch = await bcrypt.compare(currentPassword, user.password)
        if (!isMatch)
            return res.status(400).json({ error: 'Current password is incorrect' })

        user.password = await bcrypt.hash(newPassword, 10)
        await user.save()
        res.json({ success: true, message: 'Password updated successfully' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// BLOCK user
router.post('/block/:userId', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $addToSet: { blockedUsers: req.params.userId }
        })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// UNBLOCK user
router.delete('/block/:userId', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { blockedUsers: req.params.userId }
        })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// GET sessions
router.get('/sessions', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('sessions')
        res.json(user.sessions || [])
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// REVOKE session
router.delete('/sessions/:sessionId', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { sessions: { _id: req.params.sessionId } }
        })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

// DELETE account
router.delete('/account', protect, async (req, res) => {
    try {
        const { password } = req.body
        const user = await User.findById(req.user._id)
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch)
            return res.status(400).json({ error: 'Incorrect password' })

        await User.findByIdAndDelete(req.user._id)
        res.json({ success: true, message: 'Account deleted' })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

module.exports = router