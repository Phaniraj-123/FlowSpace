const mongoose = require('mongoose')

const LiveStreamSchema = new mongoose.Schema({
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  thumbnail: { type: String, default: '' },
  isLive: { type: Boolean, default: true },
  streamKey: { type: String, default: null },
  category: { type: String, default: 'Just Chatting', enum: ['Just Chatting', 'Gaming', 'Music', 'Education', 'Fitness', 'Cooking', 'Art', 'Other'] },
  isPPV: { type: Boolean, default: false },
  ppvPrice: { type: Number, default: 50 },
  peakViewers: { type: Number, default: 0 },
  avgViewers: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // in seconds
  chatCount: { type: Number, default: 0 },
  uniqueViewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ppvBuyers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  viewerCount: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    avatar: { type: String },
    text: { type: String },
    type: { type: String, enum: ['message', 'donation', 'join'], default: 'message' },
    amount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  }],
  donations: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number },
    message: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  totalDonations: { type: Number, default: 0 },
  endedAt: { type: Date }
}, { timestamps: true })

module.exports = mongoose.model('LiveStream', LiveStreamSchema)