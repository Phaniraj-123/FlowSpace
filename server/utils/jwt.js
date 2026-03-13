const jwt = require('jsonwebtoken')

const signAccessToken = (id) => jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
  expiresIn: process.env.JWT_ACCESS_EXPIRES
})

const signRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
  expiresIn: process.env.JWT_REFRESH_EXPIRES
})

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET)

const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET)

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken }