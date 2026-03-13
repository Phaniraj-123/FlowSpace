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
  yellow: { name: 'Yellow', price: 500, currency: 'INR', split: 50, color: '#f59e0b', emoji: '🟡', requirements: { followers: 10, streams: 7 } },
  green: { name: 'Green', price: 1500, currency: 'INR', split: 60, color: '#22c55e', emoji: '🟢', requirements: { followers: 10, streams: 7 } },
  purple: { name: 'Purple', price: 2500, currency: 'INR', split: 70, color: '#a855f7', emoji: '🟣', requirements: { followers: 10, streams: 7 } }
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
    const { plan, creatorId } = req.body
    const planInfo = PLANS[plan]
    if (!planInfo) return res.status(400).json({ error: 'Invalid plan' })

    const creator = await User.findById(creatorId)
    if (!creator) return res.status(404).json({ error: 'Creator not found' })
    if (!creator.subscriptionTier)
      return res.status(400).json({ error: 'Creator is not accepting subscriptions' })

    const order = await razorpay.orders.create({
      amount: planInfo.price * 100, // paise
      currency: planInfo.currency,
      receipt: `sub_${req.user._id}_${creatorId}_${Date.now()}`,
      notes: {
        subscriberId: req.user._id.toString(),
        creatorId: creatorId.toString(),
        plan
      }
    })

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: planInfo,
      creator: { username: creator.username, avatar: creator.avatar }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// VERIFY payment + activate subscription
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, creatorId, plan } = req.body

    // verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex')

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ error: 'Invalid payment signature' })

    const planInfo = PLANS[plan]
    const creator = await User.findById(creatorId)

    // calculate split
    const totalAmount = planInfo.price // INR
    const creatorShare = Math.floor(totalAmount * planInfo.split / 100)
    const flowspaceShare = totalAmount - creatorShare

    // credit creator wallet
    let creatorWallet = await Wallet.findOne({ user: creatorId })
    if (!creatorWallet) creatorWallet = await Wallet.create({ user: creatorId })
    creatorWallet.balance += creatorShare * 10 // convert to coins (1 INR = 10 coins)
    creatorWallet.totalEarned += creatorShare * 10
    creatorWallet.transactions.push({
      type: 'credit',
      amount: creatorShare * 10,
      description: `${plan} subscription from ${req.user.username} (₹${creatorShare})`,
      from: req.user._id
    })
    await creatorWallet.save()

    // save subscription to DB
    const Subscription = require('../models/Subscription')
    const renewsAt = new Date()
    renewsAt.setMonth(renewsAt.getMonth() + 1)

    await Subscription.findOneAndUpdate(
      { subscriber: req.user._id, creator: creatorId },
      {
        subscriber: req.user._id,
        creator: creatorId,
        tier: plan,
        price: planInfo.price,
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
      message: `Subscribed! Creator gets ₹${creatorShare}, FlowSpace gets ₹${flowspaceShare}`
    })
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