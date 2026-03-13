const mongoose = require('mongoose')

const MessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  text: { type: String, default: '' },
  image: { type: String, default: '' },
  seen: { type: Boolean, default: false }
}, { timestamps: true })

module.exports = mongoose.model('Message', MessageSchema)