import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Streams({ token }) {
  const headers = { Authorization: `Bearer ${token}` }
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('${API}/api/admin/streams', { headers })
      .then(res => setStreams(res.data))
      .finally(() => setLoading(false))
  }, [])

  async function endStream(id) {
    await axios.patch(`${API}/api/admin/streams/${id}/end`, {}, { headers })
    setStreams(streams.map(s => s._id === id ? { ...s, isLive: false } : s))
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>🔴 Live Streams ({streams.length})</h1>
      {loading ? <p style={{ color: 'var(--text2)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {streams.map(s => (
            <div key={s._id} style={{
              background: 'var(--bg2)', border: `1px solid ${s.isLive ? '#ef444433' : 'var(--border)'}`,
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  {s.isLive && <span style={{
                    background: '#ef4444', color: '#fff',
                    padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800
                  }}>LIVE</span>}
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</p>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                  by @{s.host?.username} · {s.viewerCount || 0} viewers · {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              {s.isLive && (
                <button onClick={() => endStream(s._id)} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none',
                  background: '#ef444422', color: '#ef4444',
                  fontSize: 12, cursor: 'pointer', fontWeight: 600
                }}>End Stream</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}