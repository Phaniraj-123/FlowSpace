import { useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [followed, setFollowed] = useState({})
  const { token, user } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()


  async function handleSearch(e) {
    const val = e.target.value
    setQuery(val)
    if (!val.trim()) return setResults([])
    setLoading(true)
    try {
      const res = await axios.get(`http://localhost:5000/api/users/search/${val}`, { headers })
      setResults(res.data)
      // set initial follow state from server
      const followMap = {}
      res.data.forEach(u => { followMap[u._id] = u.isFollowing })
      setFollowed(followMap)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function followUser(userId) {
    try {
      await axios.post(`http://localhost:5000/api/users/${userId}/follow`, {}, { headers })
      setFollowed({ ...followed, [userId]: true })
    } catch (err) { console.log(err) }
  }

  async function unfollowUser(userId) {
    try {
      await axios.delete(`http://localhost:5000/api/users/${userId}/follow`, { headers })
      setFollowed({ ...followed, [userId]: false })
    } catch (err) { console.log(err) }
  }

  

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px' }}>
      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-display)', fontSize: 26,
        fontWeight: 800, marginBottom: 24
      }}>Search</h1>

      {/* Search input */}
      <div className="fade-up-2" style={{ position: 'relative', marginBottom: 28 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)', fontSize: 18, pointerEvents: 'none'
        }}>🔍</span>
        <input
          value={query}
          onChange={handleSearch}
          placeholder="Search users by username..."
          style={{
            width: '100%', padding: '14px 14px 14px 44px',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, color: 'var(--text)', fontSize: 15,
            outline: 'none', transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>
          Searching...
        </div>
      )}

      {/* No results */}
      {!loading && query && results.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 48, color: 'var(--text2)',
          background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🤷</p>
          <p>No users found for "<strong>{query}</strong>"</p>
        </div>
      )}

      {/* Empty state */}
      {!query && (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--text2)',
          background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>Find people</p>
          <p style={{ fontSize: 14 }}>Search by username to find and follow people</p>
        </div>
      )}

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {results.map((u, i) => {
          const isFollowed = followed[u._id]
          return (
            <div key={u._id} className="fade-up" style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, animationDelay: `${i * 0.05}s`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar src={user?.avatar} name={user?.username} size={38} />
                <div
                  onClick={() => navigate(`/user/${u.username}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                >
                  <Avatar src={u.avatar} name={u.username} size={42} />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{u.username}</p>
                    {u.bio && <p style={{ color: 'var(--text2)', fontSize: 13 }}>{u.bio}</p>}
                    <p style={{ color: 'var(--text2)', fontSize: 12 }}>{u.followers?.length || 0} followers</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => isFollowed ? unfollowUser(u._id) : followUser(u._id)}
                style={{
                  padding: '8px 18px', borderRadius: 20, fontSize: 13,
                  fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  background: isFollowed ? 'var(--bg3)' : 'var(--indigo)',
                  color: isFollowed ? 'var(--text2)' : '#fff',
                  border: isFollowed ? '1px solid var(--border2)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {isFollowed ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}