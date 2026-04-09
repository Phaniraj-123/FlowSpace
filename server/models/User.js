

const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')


const UserSchema = new mongoose.Schema({
  isAdmin: { type: Boolean, default: false },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  isBanned: { type: Boolean, default: false },
  streamKey: { type: String, default: () => require('crypto').randomBytes(16).toString('hex') },
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subscriptionTier: { type: String, enum: ['yellow', 'green', 'purple'], default: null },
  totalEarnings: { type: Number, default: 0 },
  name: { type: String, default: '' },
  settings: {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    notifications: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      donations: { type: Boolean, default: true },
    },
    privacy: {
      isPrivate: { type: Boolean, default: false },
      showOnlineStatus: { type: Boolean, default: true },
    }
  },
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sessions: [{
    device: { type: String },
    ip: { type: String },
    lastActive: { type: Date, default: Date.now },
    token: { type: String }
  }],
  streak: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActiveDate: { type: Date }
  },
  totalFocusMinutes: { type: Number, default: 0 },
  isOnline: { type: Boolean, default: false },
  refreshToken: { type: String, default: '' },
}, { timestamps: true })



UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}


module.exports = mongoose.model('User', UserSchema)