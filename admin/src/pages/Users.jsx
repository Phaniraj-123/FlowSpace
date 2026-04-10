import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Users({ token }) {
  const headers = { Authorization: `Bearer ${token}` }
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    axios.get('https://flowspace-3ief.onrender.com/api/admin/users', { headers })
      .then(res => setUsers(res.data))
      .finally(() => setLoading(false))
  }, [])

  async function banUser(id, isBanned) {
    await axios.patch(`${API}/api/admin/users/${id}/ban`, {}, { headers })
    setUsers(users.map(u => u._id === id ? { ...u, isBanned: !isBanned } : u))
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user and all their posts?')) return
    await axios.delete(`${API}/api/admin/users/${id}`, { headers })
    setUsers(users.filter(u => u._id !== id))
  }

  async function setTier(id, tier) {
    await axios.patch(`${API}/api/admin/users/${id}/tier`, { tier }, { headers })
    setUsers(users.map(u => u._id === id ? { ...u, subscriptionTier: tier || null } : u))
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>👥 Users ({users.length})</h1>
      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by username or email..."
        style={{
          width: '100%', maxWidth: 400, padding: '10px 14px', marginBottom: 20,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
        }}
      />
      {loading ? <p style={{ color: 'var(--text2)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(u => (
            <div key={u._id} style={{
              background: 'var(--bg2)', border: `1px solid ${u.isBanned ? '#ef444433' : 'var(--border)'}`,
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }}>
              <img src={u.avatar || ''} alt={u.username}
                style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg3)', objectFit: 'cover' }}
                onError={e => e.target.style.display = 'none'}
              />
              <div style={{ flex: 1, minWidth: 150 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>
                  {u.username}
                  {u.isAdmin && <span style={{ color: 'var(--indigo)', fontSize: 11, marginLeft: 6 }}>ADMIN</span>}
                  {u.isBanned && <span style={{ color: '#ef4444', fontSize: 11, marginLeft: 6 }}>BANNED</span>}
                  {u.subscriptionTier && <span style={{ color: '#f59e0b', fontSize: 11, marginLeft: 6 }}>{u.subscriptionTier.toUpperCase()}</span>}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>{u.email}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {/* Tier selector */}
                <select onChange={e => setTier(u._id, e.target.value)} value={u.subscriptionTier || ''} style={{
                  padding: '5px 8px', background: 'var(--bg3)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 12, cursor: 'pointer'
                }}>
                  <option value="">No Tier</option>
                  <option value="yellow">🟡 Yellow</option>
                  <option value="green">🟢 Green</option>
                  <option value="purple">🟣 Purple</option>
                </select>
                <button onClick={() => banUser(u._id, u.isBanned)} style={{
                  padding: '5px 12px', borderRadius: 8, border: 'none',
                  background: u.isBanned ? '#10b98122' : '#ef444422',
                  color: u.isBanned ? '#10b981' : '#ef4444',
                  fontSize: 12, cursor: 'pointer', fontWeight: 600
                }}>
                  {u.isBanned ? 'Unban' : 'Ban'}
                </button>
                <button onClick={() => deleteUser(u._id)} style={{
                  padding: '5px 12px', borderRadius: 8, border: 'none',
                  background: '#ef444422', color: '#ef4444',
                  fontSize: 12, cursor: 'pointer', fontWeight: 600
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}