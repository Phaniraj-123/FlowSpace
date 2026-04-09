const express = require('express')
const router = express.Router()
const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const { protect } = require('../middleware/auth')
const upload = require('../middleware/upload')
const { uploadToCloudinary } = require('../utils/cloudinary')

// GET all conversations for current user
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username avatar')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 })

    // add unread count per conversation
    const Message = require('../models/Message')
    const convsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: req.user._id },
          seen: false
        })
        return { ...conv.toObject(), unreadCount }
      })
    )

    res.json(convsWithUnread)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET or CREATE conversation with a user
router.post('/conversations', protect, async (req, res) => {
  try {
    const { userId } = req.body
    // check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] }
    }).populate('participants', 'username avatar')

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, userId]
      })
      conversation = await conversation.populate('participants', 'username avatar')
    }
    res.json(conversation)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET messages in a conversation
router.get('/conversations/:id/messages', protect, async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 })
      .limit(100)

    // mark all as seen
    await Message.updateMany(
      { conversation: req.params.id, sender: { $ne: req.user._id }, seen: false },
      { seen: true }
    )

    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// SEND message with optional media
router.post('/conversations/:id/messages', protect, upload.single('media'), async (req, res) => {
  try {
    let image = ''
    if (req.file) {
      image = await uploadToCloudinary(req.file.buffer, req.file.mimetype)
    }

    const Message = require('../models/Message')
    const message = await Message.create({
      conversation: req.params.id,
      sender: req.user._id,
      text: req.body.text || '',
      image
    })

    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: message._id,
      lastMessageText: req.body.text || '📷 Photo',
      lastMessageAt: new Date()
    })

    const populated = await message.populate('sender', 'username avatar')

    // emit via socket too
    req.app.get('io')?.to(`dm:${req.params.id}`).emit('dm:message', populated)

    res.json(populated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// DELETE message
router.delete('/:id', protect, async (req, res) => {
  try {
    const Message = require('../models/Message')
    const message = await Message.findById(req.params.id)
    if (!message) return res.status(404).json({ error: 'Message not found' })
    if (message.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Not your message' })

    const convId = message.conversation
    await Message.findByIdAndDelete(req.params.id)

    // update conversation last message
    const lastMessage = await Message.findOne({ conversation: convId })
      .sort({ createdAt: -1 })

    await Conversation.findByIdAndUpdate(convId, {
      lastMessageText: lastMessage ? lastMessage.text || ' Media' : '',
      lastMessage: lastMessage?._id || null
    })

    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET unread DM count
router.get('/unread', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
    const convIds = conversations.map(c => c._id)
    const count = await Message.countDocuments({
      conversation: { $in: convIds },
      sender: { $ne: req.user._id },
      seen: false
    })
    res.json({ count })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router