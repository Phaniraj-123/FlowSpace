const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt')
const bcrypt = require('bcryptjs')

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body
    const userExists = await User.findOne({ $or: [{ email }, { username }] })
    if (userExists) return res.status(400).json({ error: 'User already exists' })

    // Hash password manually
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await User.create({ username, email, password: hashedPassword })
    const accessToken = signAccessToken(user._id)
    const refreshToken = signRefreshToken(user._id)

    await User.findByIdAndUpdate(user._id, { refreshToken })

    res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.status(201).json({ accessToken, user: { id: user._id, username: user.username, email: user.email } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const isMatch = await user.matchPassword(password)

    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' })

    if (user.isBanned) return res.status(403).json({ error: 'Your account has been banned. Contact support.' })


    const accessToken = signAccessToken(user._id)
    const refreshToken = signRefreshToken(user._id)

    await User.findByIdAndUpdate(user._id, { refreshToken })

    res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 })
    console.log('sending response...')
    res.json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        bio: user.bio,
        subscriptionTier: user.subscriptionTier,
        isAdmin: user.isAdmin
      }
    })
    console.log("response sent")
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies.refreshToken
    if (!token) return res.status(401).json({ error: 'No refresh token' })

    const decoded = verifyRefreshToken(token)
    const user = await User.findById(decoded.id)
    if (!user || user.refreshToken !== token)
      return res.status(401).json({ error: 'Invalid refresh token' })

    const accessToken = signAccessToken(user._id)
    res.json({ accessToken })
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' })
  }
})

// LOGOUT
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.refreshToken
    if (token) {
      const decoded = verifyRefreshToken(token)
      await User.findByIdAndUpdate(decoded.id, { refreshToken: '' })
    }
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router