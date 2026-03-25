const express = require('express')
const router = express.Router()
const Post = require('../models/post')
const User = require('../models/User')
const { protect } = require('../middleware/auth')
const upload = require('../middleware/upload')
const { uploadToCloudinary } = require('../utils/cloudinary')
const { createNotification } = require('../utils/notify')


// GET feed
router.get('/', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id)
    const { cursor } = req.query

    const feed = await Post.find({
      author: { $in: [...me.following, me._id] },
      ...(cursor && { createdAt: { $lt: new Date(cursor) } })
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('author', 'username avatar streak subscriptionTier')
      .populate('linkedGoal', 'title progress')

    const nextCursor = feed.length === 10 ? feed[feed.length - 1].createdAt : null
    res.json({ posts: feed, nextCursor })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// CREATE post
router.post('/', protect, upload.single('media'), async (req, res) => {
  try {
    const { content, visibility } = req.body
    console.log('body:', req.body)
    console.log('file:', req.file)
    let image = '', video = '', mediaType = ''

    if (req.file) {
      console.log('uploading to cloudinary...')
      const url = await uploadToCloudinary(req.file.buffer, req.file.mimetype)
      console.log('uploaded:', url)
      if (req.file.mimetype.startsWith('video')) {
        video = url; mediaType = 'video'
      } else {
        image = url; mediaType = 'image'
      }
    }

    const post = await Post.create({
      author: req.user._id,
      content, visibility, image, video, mediaType, type: 'text'
    })
    const populated = await post.populate('author', 'username avatar subscriptionTier')
    res.status(201).json(populated)
  } catch (err) {
    console.log('❌ error:', err.message)
    res.status(500).json({ error: err.message })
  }
})
// LIKE / UNLIKE post
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    const isLiked = post.likes.includes(req.user._id)
    if (isLiked) {
      post.likes.pull(req.user._id)
    } else {
      post.likes.push(req.user._id)
      // notify post author
      await createNotification(
        post.author, req.user._id,
        'like', `${req.user.username} liked your post`,
        `/post/${post._id}`
      )
    }
    await post.save()
    res.json({ likes: post.likes.length, isLiked: !isLiked })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ADD comment
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    post.comments.push({
      user: req.user._id,
      text: req.body.text,
      parentComment: req.body.parentComment || null
    })
    await post.save()

    // notify
    const type = req.body.parentComment ? 'reply' : 'comment'
    const message = req.body.parentComment
      ? `${req.user.username} replied to a comment`
      : `${req.user.username} commented on your post`

    await createNotification(
      post.author, req.user._id,
      type, message, `/post/${post._id}`
    )

    const updated = await Post.findById(req.params.id)
      .populate('author', 'username avatar subscriptionTier')
      .populate('comments.user', 'username avatar subscriptionTier')

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
// GET comments for a post
// router.get('/:id/comments', async (req, res) => {
//   try {
//     const post = await Post.findById(req.params.id)
//       .populate('comments.user', 'username avatar')
//     res.json(post.comments)
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// GET single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username avatar subscriptionTier')
      .populate('comments.user', 'username avatar subscriptionTier')
    if (!post) return res.status(404).json({ error: 'Post not found' })
    res.json(post)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// LIKE a comment
router.post('/:id/comments/:commentId/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    const comment = post.comments.id(req.params.commentId)
    if (!comment) return res.status(404).json({ error: 'Comment not found' })

    const isLiked = comment.likes.includes(req.user._id)
    if (isLiked) {
      comment.likes.pull(req.user._id)
    } else {
      comment.likes.push(req.user._id)
    }
    await post.save()
    res.json({ likes: comment.likes.length, isLiked: !isLiked })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE post
// router.delete('/:id', protect, async (req, res) => {
//   try {
//     await Post.findOneAndDelete({ _id: req.params.id, author: req.user._id })
//     res.json({ message: 'Post deleted' })
//   } catch (err) {
//     res.status(500).json({ error: err.message })
//   }
// })

// GET posts by username
router.get('/user/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const posts = await Post.find({ author: user._id })
      .populate('author', 'username avatar subscriptionTier')
      .populate('comments.user', 'username avatar subscriptionTier')
      .sort({ createdAt: -1 })
    res.json(posts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:postId', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    const isAuthor = post.author.toString() === req.user._id.toString()
    const isAdmin = req.user.isAdmin

    if (!isAuthor && !isAdmin)
      return res.status(403).json({ error: 'Not authorized' })

    await Post.findByIdAndDelete(req.params.postId)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router