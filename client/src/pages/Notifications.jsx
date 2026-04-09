import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Heart, MessageCircle, CornerDownRight, Bell } from 'lucide-react'
import Avatar from '../components/Avatar'
import API from "../api"


export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications()
    markAllRead()
  }, [])

  async function fetchNotifications() {
    try {
      const res = await axios.get('${API}/api/notifications', { headers })
      setNotifications(res.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function markAllRead() {
    try {
      await axios.patch('${API}/api/notifications/read-all', {}, { headers })
    } catch (err) { console.log(err) }
  }

  const icons = {
    follow: '👤',
    like: '❤️',
    comment: '💬',
    reply: '↩️'
  }

 

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px 100px' }}>
      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-display)', fontSize: 26,
        fontWeight: 800, marginBottom: 24
      }}>Notifications</h1>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
          Loading...
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--text2)',
          background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔔</p>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>
            No notifications yet
          </p>
          <p style={{ fontSize: 14 }}>When someone follows or likes your posts, you'll see it here</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notifications.map((n, i) => (
          <div key={n._id} className="fade-up"
            onClick={() => n.link && navigate(n.link)}
            style={{
              background: n.isRead ? 'var(--bg2)' : 'var(--indigo-dim)',
              border: `1px solid ${n.isRead ? 'var(--border)' : 'var(--indigo)33'}`,
              borderRadius: 14, padding: 16,
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: n.link ? 'pointer' : 'default',
              animationDelay: `${i * 0.04}s`,
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => { if (n.link) e.currentTarget.style.background = 'var(--bg3)' }}
            onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'var(--bg2)' : 'var(--indigo-dim)'}
          >
            {/* Icon */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18
            }}>
              {icons[n.type]}
            </div>

            {/* Avatar */}
            <Avatar src={n.from?.avatar} name={n.from?.username} size={36} />
            {/* Message */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.4 }}>
                {n.message}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                {new Date(n.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>

            {/* Unread dot */}
            {!n.isRead && (
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--indigo)', flexShrink: 0
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}