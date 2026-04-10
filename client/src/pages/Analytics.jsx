import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { TrendingUp, Clock, Target, Zap, Flame, Award } from 'lucide-react'
import API from "../api";

export default function Analytics() {
  const { token } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const [stats, setStats] = useState(null)
  const [sessions, setSessions] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [statsRes, sessionsRes, goalsRes] = await Promise.all([
        axios.get('https://flowspace-3ief.onrender.com/api/users/me/stats', { headers }),
        axios.get('https://flowspace-3ief.onrender.com/api/sessions/history', { headers }),
        axios.get('https://flowspace-3ief.onrender.com/api/goals/me', { headers })
      ])
      setStats(statsRes.data)
      setSessions(sessionsRes.data)
      setGoals(goalsRes.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  // Build last 7 days focus data
  function buildFocusData() {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const label = date.toLocaleDateString('en-US', { weekday: 'short' })
      const dateStr = date.toISOString().split('T')[0]

      const dayMinutes = sessions
        .filter(s => s.endTime && s.startTime?.split('T')[0] === dateStr)
        .reduce((sum, s) => sum + (s.actualDuration || 0), 0)

      days.push({ day: label, minutes: dayMinutes, hours: Math.round(dayMinutes / 60 * 10) / 10 })
    }
    return days
  }

  // Build goals by status
  function buildGoalsData() {
    const statusCount = { active: 0, completed: 0, paused: 0 }
    goals.forEach(g => { statusCount[g.status] = (statusCount[g.status] || 0) + 1 })
    return Object.entries(statusCount).map(([name, value]) => ({ name, value }))
  }

  // Build heatmap (last 30 days)
  function buildHeatmap() {
    const cells = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const minutes = sessions
        .filter(s => s.endTime && s.startTime?.split('T')[0] === dateStr)
        .reduce((sum, s) => sum + (s.actualDuration || 0), 0)
      cells.push({ date: dateStr, minutes, level: minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 120 ? 3 : 4 })
    }
    return cells
  }

  const heatmapColors = ['var(--bg3)', '#6366f133', '#6366f166', '#6366f199', 'var(--indigo)']

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '10px 14px', fontSize: 13
      }}>
        <p style={{ color: 'var(--text2)', marginBottom: 4 }}>{label}</p>
        <p style={{ color: 'var(--indigo-light)', fontWeight: 700 }}>
          {payload[0].value} {payload[0].name === 'hours' ? 'hrs' : 'min'}
        </p>
      </div>
    )
  }

  const StatCard = ({ icon: Icon, value, label, color, sub }) => (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '20px 18px',
      display: 'flex', alignItems: 'center', gap: 16
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: `${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 26,
          fontWeight: 800, color, lineHeight: 1
        }}>{value}</p>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>{label}</p>
        {sub && <p style={{ color: 'var(--text2)', fontSize: 11, marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading analytics...</div>
  )

  const focusData = buildFocusData()
  const goalsData = buildGoalsData()
  const heatmap = buildHeatmap()
  const totalThisWeek = focusData.reduce((sum, d) => sum + d.minutes, 0)
  const bestDay = focusData.reduce((best, d) => d.minutes > best.minutes ? d : best, { minutes: 0 })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 100px' }}>
      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-display)', fontSize: 26,
        fontWeight: 800, marginBottom: 8
      }}>Analytics</h1>
      <p className="fade-up" style={{ color: 'var(--text2)', marginBottom: 28, fontSize: 14 }}>
        Your productivity at a glance
      </p>

      {/* Stat cards */}
      <div className="fade-up-2" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 14, marginBottom: 28
      }}>
        <StatCard icon={Clock} value={`${stats?.totalFocusHours || 0}h`}
          label="Total Focus Time" color="#6366f1"
          sub={`${stats?.totalFocusMinutes || 0} minutes`} />
        <StatCard icon={Zap} value={Math.round(totalThisWeek / 60 * 10) / 10 + 'h'}
          label="This Week" color="#10b981"
          sub={`${totalThisWeek} minutes`} />
        <StatCard icon={Target} value={stats?.completedGoals || 0}
          label="Goals Completed" color="#f59e0b"
          sub={`of ${stats?.goalsCount || 0} total`} />
        <StatCard icon={Flame} value={stats?.streak?.current || 0}
          label="Day Streak" color="#ef4444"
          sub={`Best: ${stats?.streak?.longest || 0} days`} />
      </div>

      {/* Focus chart */}
      <div className="fade-up-3" style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, marginBottom: 20
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>
              Focus Hours — Last 7 Days
            </h3>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>
              Best day: <strong style={{ color: 'var(--indigo-light)' }}>{bestDay.day} ({Math.round(bestDay.minutes / 60 * 10) / 10}h)</strong>
            </p>
          </div>
          <div style={{
            background: 'var(--indigo-dim)', border: '1px solid var(--indigo)33',
            borderRadius: 8, padding: '6px 12px', fontSize: 13,
            color: 'var(--indigo-light)', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <TrendingUp size={14} /> {Math.round(totalThisWeek / 60 * 10) / 10}h this week
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={focusData}>
            <defs>
              <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e30" />
            <XAxis dataKey="day" tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8888aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="hours" name="hours"
              stroke="#6366f1" strokeWidth={2.5}
              fill="url(#focusGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Goals + Sessions row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
        {/* Goals breakdown */}
        <div className="fade-up" style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 24
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: 16,
            fontWeight: 700, marginBottom: 20
          }}>Goals Breakdown</h3>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={goalsData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e30" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8888aa', fontSize: 12 }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8888aa', fontSize: 12 }}
                axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="goals" radius={[6, 6, 0, 0]}
                fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sessions stats */}
        <div className="fade-up" style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 24
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: 16,
            fontWeight: 700, marginBottom: 20
          }}>Session Stats</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Total Sessions', value: stats?.sessionsCount || 0, color: 'var(--indigo)' },
              {
                label: 'Avg Session Length',
                value: sessions.length > 0
                  ? Math.round(sessions.reduce((s, x) => s + (x.actualDuration || 0), 0) / sessions.length) + ' min'
                  : '—',
                color: '#10b981'
              },
              {
                label: 'Longest Session',
                value: sessions.length > 0
                  ? Math.max(...sessions.map(s => s.actualDuration || 0)) + ' min'
                  : '—',
                color: '#f59e0b'
              },
              { label: 'This Week', value: focusData.filter(d => d.minutes > 0).length + ' active days', color: '#ef4444' }
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: 'var(--bg3)',
                borderRadius: 10, border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{item.label}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: item.color, fontFamily: 'var(--font-display)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="fade-up" style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 16,
          fontWeight: 700, marginBottom: 6
        }}>Activity Heatmap — Last 30 Days</h3>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
          Each cell = one day. Darker = more focus time.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {heatmap.map((cell, i) => (
            <div key={i} title={`${cell.date}: ${cell.minutes} min`} style={{
              width: 24, height: 24, borderRadius: 4,
              background: heatmapColors[cell.level],
              border: '1px solid var(--border)',
              cursor: 'default', transition: 'transform 0.1s'
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Less</span>
          {heatmapColors.map((c, i) => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: 3,
              background: c, border: '1px solid var(--border)'
            }} />
          ))}
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>More</span>
        </div>
      </div>
    </div>
  )
}