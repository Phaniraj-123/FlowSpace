import { useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Avatar, { TierBadge } from '../components/Avatar'
import API from "../api"


export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [followed, setFollowed] = useState({})
  const [searchTab, setSearchTab] = useState('users')
  const { token } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()

  async function handleSearch(e) {
    const val = e.target.value
    setQuery(val)
    if (!val.trim()) { setResults([]); setPosts([]); return }
    setLoading(true)
    try {
      const res = await axios.get(`${API}/api/users/search/${val}`, { headers })
      if (res.data.users) {
        setResults(res.data.users)
        setPosts(res.data.posts || [])
        const followMap = {}
        res.data.users.forEach(u => { followMap[u._id] = u.isFollowing })
        setFollowed(followMap)
      } else {
        const data = Array.isArray(res.data) ? res.data : []
        setResults(data)
        setPosts([])
        const followMap = {}
        data.forEach(u => { followMap[u._id] = u.isFollowing })
        setFollowed(followMap)
      }
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function followUser(userId) {
    try {
      await axios.post(`${API}/api/users/${userId}/follow`, {}, { headers })
      setFollowed({ ...followed, [userId]: true })
    } catch (err) { console.log(err) }
  }

  async function unfollowUser(userId) {
    try {
      await axios.delete(`${API}/api/users/${userId}/follow`, { headers })
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
      <div className="fade-up-2" style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{
          position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)', fontSize: 18, pointerEvents: 'none'
        }}>🔍</span>
        <input
          value={query}
          onChange={handleSearch}
          placeholder="Search users and posts..."
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

      {/* Tabs */}
      {(results.length > 0 || posts.length > 0) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setSearchTab('users')} style={{
            padding: '8px 20px', borderRadius: 20,
            background: searchTab === 'users' ? 'var(--indigo)' : 'var(--bg2)',
            color: searchTab === 'users' ? '#fff' : 'var(--text2)',
            border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>
            👤 Users ({results.length})
          </button>
          <button onClick={() => setSearchTab('posts')} style={{
            padding: '8px 20px', borderRadius: 20,
            background: searchTab === 'posts' ? 'var(--indigo)' : 'var(--bg2)',
            color: searchTab === 'posts' ? '#fff' : 'var(--text2)',
            border: '1px solid var(--border)', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>
            📝 Posts ({posts.length})
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 20 }}>
          Searching...
        </div>
      )}

      {/* Empty state */}
      {!query && (
        <div style={{
          textAlign: 'center', padding: 60, color: 'var(--text2)',
          background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
          <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>Find people & posts</p>
          <p style={{ fontSize: 14 }}>Search by username or keywords</p>
        </div>
      )}

      {/* No results */}
      {!loading && query && results.length === 0 && posts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 48, color: 'var(--text2)',
          background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
        }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🤷</p>
          <p>No results for "<strong>{query}</strong>"</p>
        </div>
      )}

      {/* Users results */}
      {searchTab === 'users' && (
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
                <div
                  onClick={() => navigate(`/user/${u.username}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', flex: 1 }}
                >
                  <Avatar src={u.avatar} name={u.username} size={42} tier={u.subscriptionTier} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                      <p style={{ fontWeight: 700, fontSize: 15 }}>{u.username}</p>
                      <TierBadge tier={u.subscriptionTier} />
                    </div>
                    {u.bio && <p style={{ color: 'var(--text2)', fontSize: 13 }}>{u.bio}</p>}
                    <p style={{ color: 'var(--text2)', fontSize: 12 }}>{u.followers?.length || 0} followers</p>
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
      )}

      {/* Posts results */}
      {searchTab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post, i) => (
            <div key={post._id} onClick={() => navigate(`/post/${post._id}`)}
              className="fade-up"
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 16, cursor: 'pointer',
                animationDelay: `${i * 0.05}s`, transition: 'border-color 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--indigo)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <Avatar src={post.author?.avatar} name={post.author?.username} size={32} tier={post.author?.subscriptionTier} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{post.author?.username}</span>
                  <TierBadge tier={post.author?.subscriptionTier} />
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                {post.content?.slice(0, 150)}{post.content?.length > 150 ? '...' : ''}
              </p>
              {post.image && (
                <img src={post.image} alt="post" style={{
                  width: '100%', borderRadius: 8, marginTop: 8,
                  maxHeight: 200, objectFit: 'cover'
                }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}