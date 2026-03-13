const mongoose = require('mongoose')

const SessionSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date }
  }],
  isLive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: true },
  duration: { type: Number, default: 25 },
  actualDuration: { type: Number, default: 0 },
  tags: [String],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  pomoCycles: { type: Number, default: 0 }
}, { timestamps: true })

module.exports = mongoose.model('Session', SessionSchema)