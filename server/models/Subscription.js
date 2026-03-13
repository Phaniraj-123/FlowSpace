const mongoose = require('mongoose')

const SubscriptionSchema = new mongoose.Schema({
  subscriber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tier: { type: String, enum: ['basic', 'pro', 'vip'], default: 'basic' },
  price: { type: Number, required: true },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  paymentId: { type: String },
  orderId: { type: String },
  renewsAt: { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('Subscription', SubscriptionSchema)