const express = require('express')
const router = express.Router()
const Goal = require('../models/Goal')
const { protect } = require('../middleware/auth')
const { checkAchievements } = require('../utils/achievements')

function computeProgress(goal) {
  if (goal.tasks.length > 0) {
    const done = goal.tasks.filter(t => t.completed).length
    goal.progress = Math.round((done / goal.tasks.length) * 100)
    if (goal.progress === 100) goal.status = 'completed'
  }
  return goal
}

// CREATE goal
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, isPublic, dueDate, tasks } = req.body
    const goal = await Goal.create({
      owner: req.user._id,
      title, description, isPublic, dueDate,
      tasks: tasks || []
    })
    res.status(201).json(goal)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET all my goals
router.get('/me', protect, async (req, res) => {
  try {
    const goals = await Goal.find({ owner: req.user._id }).sort({ createdAt: -1 })
    res.json(goals)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET single goal
router.get('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id).populate('owner', 'username avatar')
    if (!goal) return res.status(404).json({ error: 'Goal not found' })
    res.json(goal)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// UPDATE goal
router.patch('/:id', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, owner: req.user._id })
    if (!goal) return res.status(404).json({ error: 'Goal not found' })

    Object.assign(goal, req.body)
    await goal.save()
    await checkAchievements(req.user._id)
    res.json(goal)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE goal
router.delete('/:id', protect, async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
    res.json({ message: 'Goal deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// COMPLETE a task inside a goal
router.patch('/:id/tasks/:taskId', protect, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, owner: req.user._id })
    if (!goal) return res.status(404).json({ error: 'Goal not found' })

    const task = goal.tasks.id(req.params.taskId)
    if (!task) return res.status(404).json({ error: 'Task not found' })

    task.completed = !task.completed
    task.completedAt = task.completed ? new Date() : null

    // compute progress manually
    const done = goal.tasks.filter(t => t.completed).length
    goal.progress = Math.round((done / goal.tasks.length) * 100)
    if (goal.progress === 100) goal.status = 'completed'

    await goal.save()
    res.json(goal)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET public goals by userId
router.get('/user/:userId', async (req, res) => {
  try {
    const goals = await Goal.find({
      owner: req.params.userId,
      isPublic: true
    }).sort({ createdAt: -1 })
    res.json(goals)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router