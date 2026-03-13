import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tasks, setTasks] = useState('')
  const [showForm, setShowForm] = useState(false)
  const token = useAuthStore((state) => state.token)
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => { fetchGoals() }, [])

  async function fetchGoals() {
    try {
      const res = await axios.get('http://localhost:5000/api/goals/me', { headers })
      setGoals(res.data)
    } catch (err) { console.log(err) }
  }

  async function createGoal(e) {
    e.preventDefault()
    try {
      const taskList = tasks.split(',').map(t => ({ text: t.trim() })).filter(t => t.text)
      await axios.post('http://localhost:5000/api/goals', { title, description, tasks: taskList }, { headers })
      setTitle(''); setDescription(''); setTasks(''); setShowForm(false)
      fetchGoals()
    } catch (err) { console.log(err) }
  }

  async function completeTask(goalId, taskId) {
    try {
      const res = await axios.patch(`http://localhost:5000/api/goals/${goalId}/tasks/${taskId}`, {}, { headers })
      setGoals(goals.map(g => g._id === goalId ? res.data : g))
    } catch (err) { console.log(err) }
  }

  async function deleteGoal(goalId) {
    try {
      await axios.delete(`http://localhost:5000/api/goals/${goalId}`, { headers })
      setGoals(goals.filter(g => g._id !== goalId))
    } catch (err) { console.log(err) }
  }

  const statusColor = { active: 'var(--indigo)', completed: 'var(--green)', abandoned: 'var(--red)' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800 }}>Goals</h1>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '9px 20px', background: showForm ? 'var(--border2)' : 'var(--indigo)',
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
        }}>
          <Plus size={16} /> {showForm ? 'Cancel' : 'New Goal'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="fade-up" style={{
          background: 'var(--bg2)', border: '1px solid var(--indigo)44',
          borderRadius: 16, padding: 24, marginBottom: 28
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: 20, fontSize: 17 }}>New Goal</h3>
          <form onSubmit={createGoal}>
            {[
              { key: 'title', label: 'Goal Title', placeholder: 'What do you want to achieve?', val: title, set: setTitle },
              { key: 'desc', label: 'Description', placeholder: 'Why does this matter?', val: description, set: setDescription },
              { key: 'tasks', label: 'Tasks (comma separated)', placeholder: 'Read 10 pages, Exercise, Meditate', val: tasks, set: setTasks },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'var(--bg3)',
                    border: '1px solid var(--border2)', borderRadius: 10,
                    color: 'var(--text)', fontSize: 14, outline: 'none'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                />
              </div>
            ))}
            <button type="submit" style={{
              padding: '10px 24px', background: 'var(--indigo)',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600
            }}>Create Goal</button>
          </form>
        </div>
      )}

      {/* Goals */}
      {goals.length === 0 && !showForm && (
        <div style={{
          textAlign: 'center', padding: 80, color: 'var(--text2)',
          background: 'var(--bg2)', borderRadius: 20, border: '1px solid var(--border)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: 'var(--text)' }}>No goals yet</p>
          <p style={{ fontSize: 14 }}>Set your first goal and start tracking progress</p>
        </div>
      )}

      {goals.map((goal, i) => (
        <div key={goal._id} className="fade-up" style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 24, marginBottom: 16,
          animationDelay: `${i * 0.06}s`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{goal.title}</h3>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: statusColor[goal.status] + '22',
                  color: statusColor[goal.status], textTransform: 'uppercase', letterSpacing: 0.5
                }}>{goal.status}</span>
              </div>
              {goal.description && <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.5 }}>{goal.description}</p>}
            </div>
            <button onClick={() => deleteGoal(goal._id)} style={{
              background: 'none', border: 'none', color: 'var(--text2)',
              cursor: 'pointer', padding: 4, opacity: 0.6
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>Progress</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: goal.progress === 100 ? 'var(--green)' : 'var(--indigo-light)' }}>{goal.progress}%</span>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 6 }}>
              <div style={{
                height: '100%', borderRadius: 4, transition: 'width 0.4s ease',
                width: `${goal.progress}%`,
                background: goal.progress === 100 ? 'var(--green)' : 'linear-gradient(90deg, var(--indigo), #8b5cf6)'
              }} />
            </div>
          </div>

          {/* Tasks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goal.tasks.map(task => (
              <div key={task._id} onClick={() => completeTask(goal._id, task._id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', padding: '6px 10px', borderRadius: 8,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {task.completed
                  ? <CheckCircle2 size={18} color="var(--green)" />
                  : <Circle size={18} color="var(--border2)" />
                }
                <span style={{
                  fontSize: 14, color: task.completed ? 'var(--text2)' : 'var(--text)',
                  textDecoration: task.completed ? 'line-through' : 'none'
                }}>{task.text}</span>
              </div>

            ))}
          </div>
        </div>
      ))}
    </div>
  )
}