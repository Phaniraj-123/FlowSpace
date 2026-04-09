import { useState, useEffect } from 'react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard({ token }) {
  const headers = { Authorization: `Bearer ${token}` }
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    axios.get('${API}/api/admin/analytics', { headers })
      .then(res => setAnalytics(res.data))
      .catch(console.log)
  }, [])

  const stats = [
    { label: 'Total Users', value: analytics?.totalUsers, color: '#6366f1' },
    { label: 'Total Posts', value: analytics?.totalPosts, color: '#10b981' },
    { label: 'Total Streams', value: analytics?.totalStreams, color: '#ef4444' },
    { label: 'Live Now', value: analytics?.activeStreams, color: '#f59e0b' },
    { label: 'Premium Users', value: analytics?.premiumUsers, color: '#a855f7' },
    { label: 'Banned Users', value: analytics?.bannedUsers, color: '#6b7280' },
    { label: 'Total Revenue', value: analytics?.totalRevenue ? `₹${(analytics.totalRevenue / 10).toFixed(2)}` : '₹0', color: '#f59e0b' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>📊 Dashboard</h1>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 16, marginBottom: 32
      }}>
        {stats.map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 20
          }}>
            <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{stat.label}</p>
            <p style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>
              {stat.value ?? '...'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}