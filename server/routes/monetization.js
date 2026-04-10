const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/auth')
const Wallet = require('../models/Wallet')
const Subscription = require('../models/Subscription')
const User = require('../models/User')
const Post = require('../models/post')
const Razorpay = require('razorpay')
const crypto = require('crypto')

function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  })
}

// coin packages
const COIN_PACKAGES = [
  { id: 'starter', name: 'Starter', coins: 100, price: 999, displayPrice: '₹9.99', bonus: 0 },
  { id: 'basic', name: 'Basic', coins: 500, price: 3299, displayPrice: '₹39.99', bonus: 50 },
  { id: 'popular', name: 'Popular', coins: 1200, price: 6499, displayPrice: '₹64.99', bonus: 200 },
  { id: 'pro', name: 'Pro', coins: 3000, price: 14999, displayPrice: '₹149.99', bonus: 500 },
  { id: 'elite', name: 'Elite', coins: 7000, price: 32999, displayPrice: '₹329.99', bonus: 1500 },
]

// CREATE Razorpay order
router.post('/create-order', protect, async (req, res) => {
  try {
    const { packageId } = req.body
    console.log('📦 packageId received:', packageId)
    console.log('🔑 KEY_ID:', process.env.RAZORPAY_KEY_ID)
    console.log('🔑 KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET)
    const pkg = COIN_PACKAGES.find(p => p.id === packageId)
    console.log('📦 pkg found:', pkg)
    if (!pkg) return res.status(400).json({ error: 'Invalid package' })

    const order = await getRazorpay().orders.create({
      amount: pkg.price, // in paise
      currency: 'INR',
      receipt: `fs_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        packageId,
        coins: String(pkg.coins + pkg.bonus)
      }
    })

    res.json({ order, pkg, key: process.env.RAZORPAY_KEY_ID })
  } catch (err) {
    console.error('❌ Razorpay error:', err)
    res.status(500).json({ error: err.message })
  }
})

const SUB_TIERS = {
  basic: { price: 50, label: 'Basic', color: '#6366f1', perks: ['Subscriber badge', 'Support creator'] },
  pro: { price: 150, label: 'Pro', color: '#f59e0b', perks: ['Pro badge', 'Exclusive posts', 'Priority in chat'] },
  vip: { price: 300, label: 'VIP', color: '#ef4444', perks: ['VIP badge', 'All Pro perks', 'Direct message access'] },
}


// VERIFY payment after Razorpay checkout
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body

    // verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ error: 'Invalid payment signature' })

    // add coins to wallet
    const pkg = COIN_PACKAGES.find(p => p.id === packageId)
    const totalCoins = pkg.coins + pkg.bonus

    let wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet) wallet = await Wallet.create({ user: req.user._id })

    wallet.balance += totalCoins
    wallet.totalEarned += totalCoins
    wallet.transactions.push({
      type: 'credit',
      amount: totalCoins,
      description: `Purchased ${pkg.name} package (${totalCoins} coins) via Razorpay`,
      razorpayPaymentId: razorpay_payment_id
    })
    await wallet.save()

    res.json({ success: true, newBalance: wallet.balance, coinsAdded: totalCoins })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET wallet
router.get('/wallet', protect, async (req, res) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet) wallet = await Wallet.create({ user: req.user._id })
    res.json(wallet)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET coin packages
router.get('/packages', (req, res) => {
  res.json(COIN_PACKAGES)
})

// BUY coins (simulated)
router.post('/buy-coins', protect, async (req, res) => {
  try {
    const { packageId } = req.body
    const pkg = COIN_PACKAGES.find(p => p.id === packageId)
    if (!pkg) return res.status(400).json({ error: 'Invalid package' })

    const totalCoins = pkg.coins + pkg.bonus
    let wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet) wallet = await Wallet.create({ user: req.user._id })

    wallet.balance += totalCoins
    wallet.totalEarned += totalCoins
    wallet.transactions.push({
      type: 'credit',
      amount: totalCoins,
      description: `Purchased ${pkg.name} package (${totalCoins} coins)`
    })
    await wallet.save()

    res.json({ success: true, newBalance: wallet.balance, coinsAdded: totalCoins })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET sub tiers
router.get('/sub-tiers', (req, res) => {
  res.json(SUB_TIERS)
})

// SUBSCRIBE to creator
router.post('/subscribe/:creatorId', protect, async (req, res) => {
  try {
    const { tier } = req.body
    const tierInfo = SUB_TIERS[tier]
    if (!tierInfo) return res.status(400).json({ error: 'Invalid tier' })

    const creator = await User.findById(req.params.creatorId)
    if (!creator) return res.status(404).json({ error: 'Creator not found' })

    if (req.params.creatorId === req.user._id.toString())
      return res.status(400).json({ error: 'Cannot subscribe to yourself' })

    // check wallet
    let wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet) wallet = await Wallet.create({ user: req.user._id })
    if (wallet.balance < tierInfo.price)
      return res.status(400).json({ error: 'Insufficient coins' })

    // check existing sub
    const existing = await Subscription.findOne({
      subscriber: req.user._id,
      creator: req.params.creatorId,
      status: 'active'
    })
    if (existing) return res.status(400).json({ error: 'Already subscribed' })

    // deduct coins
    wallet.balance -= tierInfo.price
    wallet.totalSpent += tierInfo.price
    wallet.transactions.push({
      type: 'debit',
      amount: tierInfo.price,
      description: `Subscribed to ${creator.username} (${tierInfo.label})`,
      to: creator._id
    })
    await wallet.save()

    // credit creator
    let creatorWallet = await Wallet.findOne({ user: creator._id })
    if (!creatorWallet) creatorWallet = await Wallet.create({ user: creator._id })
    creatorWallet.balance += tierInfo.price
    creatorWallet.totalEarned += tierInfo.price
    creatorWallet.transactions.push({
      type: 'credit',
      amount: tierInfo.price,
      description: `Subscription from ${req.user.username} (${tierInfo.label})`,
      from: req.user._id
    })
    await creatorWallet.save()

    // create sub
    const renewsAt = new Date()
    renewsAt.setMonth(renewsAt.getMonth() + 1)
    const sub = await Subscription.create({
      subscriber: req.user._id,
      creator: req.params.creatorId,
      tier,
      price: tierInfo.price,
      renewsAt
    })

    res.json({ success: true, subscription: sub, newBalance: wallet.balance })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// CANCEL subscription
router.delete('/subscribe/:creatorId', protect, async (req, res) => {
  try {
    await Subscription.findOneAndUpdate(
      { subscriber: req.user._id, creator: req.params.creatorId, status: 'active' },
      { status: 'cancelled' }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET my subscriptions
router.get('/my-subscriptions', protect, async (req, res) => {
  try {
    const subs = await Subscription.find({ subscriber: req.user._id, status: 'active' })
      .populate('creator', 'username avatar bio')
    res.json(subs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET my subscribers
router.get('/my-subscribers', protect, async (req, res) => {
  try {
    const subs = await Subscription.find({ creator: req.user._id, status: 'active' })
      .populate('subscriber', 'username avatar bio')
    res.json(subs)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// CHECK if subscribed to a creator
router.get('/check/:creatorId', protect, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      subscriber: req.user._id,
      creator: req.params.creatorId,
      status: 'active'
    })
    res.json({ isSubscribed: !!sub, subscription: sub })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// BOOST post
router.post('/boost/:postId', protect, async (req, res) => {
  try {
    const BOOST_COST = 50
    let wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet) wallet = await Wallet.create({ user: req.user._id })
    if (wallet.balance < BOOST_COST)
      return res.status(400).json({ error: 'Insufficient coins. Need 50 coins to boost.' })

    const post = await Post.findById(req.params.postId)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.author.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Can only boost your own posts' })

    wallet.balance -= BOOST_COST
    wallet.totalSpent += BOOST_COST
    wallet.transactions.push({
      type: 'debit', amount: BOOST_COST,
      description: `Boosted post`
    })
    await wallet.save()

    const boostedUntil = new Date()
    boostedUntil.setHours(boostedUntil.getHours() + 24)
    await Post.findByIdAndUpdate(req.params.postId, {
      isBoosted: true,
      boostedUntil
    })

    res.json({ success: true, newBalance: wallet.balance })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// REQUEST withdrawal
router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount, method, details } = req.body
    if (!amount || amount < 100)
      return res.status(400).json({ error: 'Minimum withdrawal is 100 coins' })

    let wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet) wallet = await Wallet.create({ user: req.user._id })
    if (wallet.balance < amount)
      return res.status(400).json({ error: 'Insufficient coins' })

    wallet.balance -= amount
    wallet.transactions.push({
      type: 'debit', amount,
      description: `Withdrawal request (${method})`
    })
    wallet.withdrawalRequests.push({ amount, method, details })
    await wallet.save()

    res.json({ success: true, newBalance: wallet.balance })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/earnings', protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id })
    if (!wallet) return res.json({ donations: 0, subscriptions: 0, boosts: 0 })

    const donations = wallet.transactions
      .filter(t => t.type === 'credit' && t.description?.includes('Donation'))
      .reduce((sum, t) => sum + t.amount, 0)

    const subscriptions = wallet.transactions
      .filter(t => t.type === 'credit' && t.description?.includes('Subscription'))
      .reduce((sum, t) => sum + t.amount, 0)

    const ppv = wallet.transactions
      .filter(t => t.type === 'credit' && t.description?.includes('PPV'))
      .reduce((sum, t) => sum + t.amount, 0)

    res.json({ donations, subscriptions, ppv, total: donations + subscriptions + ppv })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router