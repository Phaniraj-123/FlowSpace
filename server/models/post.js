const mongoose = require('mongoose')

const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, default: '' },
  type: { type: String, enum: ['goal_update', 'session_end', 'milestone', 'text'], default: 'text' },
  image: { type: String, default: '' },
  video: { type: String, default: '' },
  mediaType: { type: String, enum: ['image', 'video', ''], default: '' },
  isBoosted: { type: Boolean, default: false },
  boostedUntil: { type: Date },
  linkedGoal: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal' },
  linkedSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    parentComment: { type: mongoose.Schema.Types.ObjectId, default: null },
    createdAt: { type: Date, default: Date.now }
  }],
  visibility: { type: String, enum: ['public', 'followers'], default: 'public' }
}, { timestamps: true })

module.exports = mongoose.model('Post', PostSchema)