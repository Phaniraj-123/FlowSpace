const express = require('express')
const router = express.Router()
const Razorpay = require('razorpay')
const crypto = require('crypto')
const { protect } = require('../middleware/auth')
const User = require('../models/User')
const Wallet = require('../models/Wallet')
const LiveStream = require('../models/LiveStream')


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

const PLANS = {
  yellow: { name: 'Yellow', price: 399, currency: 'INR', split: 50, color: '#f59e0b', emoji: '🟡', requirements: { followers: 10, streams: 7 } },
  green: { name: 'Green', price: 999, currency: 'INR', split: 60, color: '#22c55e', emoji: '🟢', requirements: { followers: 10, streams: 7 } },
  purple: { name: 'Purple', price: 1999, currency: 'INR', split: 70, color: '#a855f7', emoji: '🟣', requirements: { followers: 10, streams: 7 } }
}

// CHECK eligibility
router.get('/eligibility', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const followersCount = user.followers?.length || 0

    // count streams in last 7 days
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const streamsThisWeek = await LiveStream.countDocuments({
      host: req.user._id,
      createdAt: { $gte: weekAgo }
    })

    const isEligible = followersCount >= 10 && streamsThisWeek >= 7
    res.json({
      isEligible,
      followersCount,
      streamsThisWeek,
      requirements: { followers: 10, streams: 7 }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET plans
router.get('/plans', (req, res) => {
  res.json(PLANS)
})

// CREATE order
router.post('/create-order', protect, async (req, res) => {
  try {
    const { creatorId, months, price } = req.body
    if (!creatorId || !months || !price)
      return res.status(400).json({ error: 'Missing fields' })

    const creator = await User.findById(creatorId)
    if (!creator) return res.status(404).json({ error: 'Creator not found' })
    if (!creator.subscriptionTier)
      return res.status(400).json({ error: 'Creator is not accepting subscriptions' })

    const order = await razorpay.orders.create({
      amount: price * 100,
      currency: 'INR',
      receipt: `sub_${req.user._id}_${creatorId}_${Date.now()}`,
      notes: {
        subscriberId: req.user._id.toString(),
        creatorId: creatorId.toString(),
        months: months.toString(),
        price: price.toString()
      }
    })

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      creator: { username: creator.username, avatar: creator.avatar }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// VERIFY payment + activate subscription
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, creatorId, months, price } = req.body

    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body).digest('hex')

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ error: 'Invalid payment signature' })

    const creator = await User.findById(creatorId)
    const tier = creator.subscriptionTier || 'yellow'
    const SPLITS = { yellow: 50, green: 60, purple: 70 }
    const split = SPLITS[tier] || 50

    const creatorShare = Math.floor(price * split / 100)
    const flowspaceShare = price - creatorShare

    // credit creator wallet
    let creatorWallet = await Wallet.findOne({ user: creatorId })
    if (!creatorWallet) creatorWallet = await Wallet.create({ user: creatorId })
    creatorWallet.balance += creatorShare * 10
    creatorWallet.totalEarned = (creatorWallet.totalEarned || 0) + creatorShare * 10
    creatorWallet.transactions.push({
      type: 'credit',
      amount: creatorShare * 10,
      description: `${months} month subscription from ${req.user.username} (₹${creatorShare})`,
      from: req.user._id
    })
    await creatorWallet.save()

    // save subscription
    const renewsAt = new Date()
    renewsAt.setMonth(renewsAt.getMonth() + months)

    await Subscription.findOneAndUpdate(
      { subscriber: req.user._id, creator: creatorId },
      {
        subscriber: req.user._id,
        creator: creatorId,
        tier,
        price,
        months,
        status: 'active',
        renewsAt,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      },
      { upsert: true, new: true }
    )

    res.json({
      success: true,
      creatorShare,
      flowspaceShare,
      message: `Subscribed for ${months} month${months > 1 ? 's' : ''}! Creator gets ₹${creatorShare}`
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// Creator pays FlowSpace to activate tier
router.post('/activate-tier', protect, async (req, res) => {
  try {
    const { tier } = req.body
    console.log('activate-tier called:', tier)
    console.log('razorpay keys:', process.env.RAZORPAY_KEY_ID?.slice(0, 10))
    const TIER_PRICES = { yellow: 39900, green: 99900, purple: 199900 } // paise
    if (!TIER_PRICES[tier]) return res.status(400).json({ error: 'Invalid tier' })

    const order = await razorpay.orders.create({
      amount: TIER_PRICES[tier],
      currency: 'INR',
      receipt: `tier_${req.user._id}_${Date.now()}`,
      notes: { userId: req.user._id.toString(), tier }
    })

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    })
  } catch (err) {
    console.log('activate-tier error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Verify tier activation payment
router.post('/activate-tier/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier } = req.body

    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body).digest('hex')

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ error: 'Invalid payment signature' })

    await User.findByIdAndUpdate(req.user._id, { subscriptionTier: tier })
    res.json({ success: true, tier, message: `✅ ${tier} tier activated!` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// CHECK and AUTO-AWARD tick to eligible creators
router.post('/check-tick', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    // already has tier — just return it
    if (user.subscriptionTier) {
      return res.json({ awarded: true, tier: user.subscriptionTier, alreadyHad: true })
    }

    const followersCount = user.followers?.length || 0
    const streamsCount = await LiveStream.countDocuments({ host: req.user._id })

    if (followersCount >= 10 && streamsCount >= 7) {
      await User.findByIdAndUpdate(req.user._id, { subscriptionTier: 'yellow' })
      return res.json({ awarded: true, tier: 'yellow' })
    }

    res.json({ awarded: false, followersCount, streamsCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// UPGRADE tier
router.post('/upgrade-tier', protect, async (req, res) => {
  try {
    const { tier } = req.body
    if (!PLANS[tier]) return res.status(400).json({ error: 'Invalid tier' })
    await User.findByIdAndUpdate(req.user._id, { subscriptionTier: tier })
    res.json({ success: true, tier })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router