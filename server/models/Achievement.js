const mongoose = require('mongoose')

const AchievementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  unlockedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Achievement', AchievementSchema)