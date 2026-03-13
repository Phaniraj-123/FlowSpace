const mongoose = require('mongoose')

const ConversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageText: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true })

module.exports = mongoose.model('Conversation', ConversationSchema)