const Notification = require('../models/Notification')

async function createNotification(to, from, type, message, link = '') {
  try {
    // don't notify yourself
    if (to.toString() === from.toString()) return
    await Notification.create({ to, from, type, message, link })
  } catch (err) {
    console.log('notification error:', err.message)
  }
}

module.exports = { createNotification }