import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Posts({ token }) {
  const headers = { Authorization: `Bearer ${token}` }
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('https://flowspace-3ief.onrender.com/api/admin/posts', { headers })
      .then(res => setPosts(res.data))
      .finally(() => setLoading(false))
  }, [])

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return
    await axios.delete(`${API}/api/admin/posts/${id}`, { headers })
    setPosts(posts.filter(p => p._id !== id))
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>📝 Posts ({posts.length})</h1>
      {loading ? <p style={{ color: 'var(--text2)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posts.map(p => (
            <div key={p._id} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: 'var(--indigo)', marginBottom: 4 }}>@{p.author?.username}</p>
                <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
                  {p.content?.slice(0, 200)}{p.content?.length > 200 ? '...' : ''}
                </p>
                {p.image && <img src={p.image} style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6, marginTop: 8 }} />}
                <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 6 }}>
                  {new Date(p.createdAt).toLocaleDateString()} · {p.likes?.length || 0} likes · {p.comments?.length || 0} comments
                </p>
              </div>
              <button onClick={() => deletePost(p._id)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: '#ef444422', color: '#ef4444',
                fontSize: 12, cursor: 'pointer', fontWeight: 600, flexShrink: 0
              }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}