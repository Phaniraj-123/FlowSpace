const mongoose = require('mongoose')

const TaskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date }
})

const GoalSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  isPublic: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  dueDate: { type: Date },
  tasks: [TaskSchema],
  progress: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true })

// Auto-compute progress before saving



module.exports = mongoose.model('Goal', GoalSchema)