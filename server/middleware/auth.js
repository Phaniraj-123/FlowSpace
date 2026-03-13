const User = require('../models/User')
const { verifyAccessToken } = require('../utils/jwt')

const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Not authorized' })

    const decoded = verifyAccessToken(token)
    req.user = await User.findById(decoded.id).select('-password')
    next()
  } catch (err) {
    res.status(401).json({ error: 'Token invalid or expired' })
  }
}

module.exports = { protect }