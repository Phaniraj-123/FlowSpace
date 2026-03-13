import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Avatar from '../components/Avatar'
import { Target, CheckCircle2, Timer, Clock, Flame, LogOut, ChevronRight, Camera, Edit2, X, Check, Crown, Settings as SettingsIcon } from 'lucide-react'

export default function Profile() {
  const { user, token, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const headers = { Authorization: `Bearer ${token}` }
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [editingBio, setEditingBio] = useState(false)
  const [bio, setBio] = useState(user?.bio || '')
  const [savingBio, setSavingBio] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const fileRef = useRef(null)


  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    try {
      const res = await axios.get('http://localhost:5000/api/users/me/stats', { headers })
      setStats(res.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function uploadAvatar(file) {
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await axios.put('http://localhost:5000/api/users/me/profile', formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      })
      updateUser({ avatar: res.data.avatar })
      setAvatarPreview(null)
    } catch (err) { console.log(err) }
    finally { setUploadingAvatar(false) }
  }

  async function saveBio() {
    setSavingBio(true)
    try {
      const res = await axios.put('http://localhost:5000/api/users/me/profile',
        { bio }, { headers })
      updateUser({ bio: res.data.bio })
      setEditingBio(false)
    } catch (err) { console.log(err) }
    finally { setSavingBio(false) }
  }

  function handleLogout() {
    useAuthStore.getState().logout()
    navigate('/login')
  }

    {/* {Modal} */}
        const UserListModal = ({title, users, onClose}) => ( 
        <div style={{
          position: 'fixed', inset: 0, background: '#00000088',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
        }} onClick={onClose}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
            maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{title}</h3>
              <button onClick={onClose} style={{
                background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20
              }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {users?.length === 0 && (
                <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 20 }}>No users yet</p>
              )}
              {users?.map(u => (
                <div key={u._id} onClick={() => { onClose(); navigate(`/user/${u.username}`) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '4px 0' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                  onMouseLeave={e => e.currentTarget.style.opacity = 1}
                >
                  <Avatar src={u.avatar} name={u.username} size={40} />
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</p>
                    {u.bio && <p style={{ fontSize: 12, color: 'var(--text2)' }}>{u.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        )

  const StatCard = ({ icon, value, label, color = 'var(--indigo)' }) => (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 16px', textAlign: 'center'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 24,
        fontWeight: 800, color, marginBottom: 4
      }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</div>
    </div>
  )



  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 100px' }}>

      {showFollowers && (
        <UserListModal
          title={`Followers (${stats?.followersCount || 0})`}
          users={stats?.followers || []}
          onClose={() => setShowFollowers(false)}
        />
      )}
      {showFollowing && (
        <UserListModal
          title={`Following (${stats?.followingCount || 0})`}
          users={stats?.following || []}
          onClose={() => setShowFollowing(false)}
        />
      )}

      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-display)', fontSize: 26,
        fontWeight: 800, marginBottom: 28
      }}>Profile</h1>

      {/* User card */}
      <div className="fade-up-2" style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 28, marginBottom: 20
      }}>
        {/* Avatar + info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20 }}>

          {/* Avatar with upload */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Avatar
              src={avatarPreview || user?.avatar}
              name={user?.username}
              size={80}
            />
            <button
              onClick={() => fileRef.current.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--indigo)', border: '2px solid var(--bg2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff'
              }}
            >
              {uploadingAvatar ? (
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  border: '2px solid #fff', borderTopColor: 'transparent',
                  animation: 'spin 0.6s linear infinite'
                }} />
              ) : <Camera size={12} />}
            </button>
            <input
              ref={fileRef} type="file" accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0]
                if (file) {
                  setAvatarPreview(URL.createObjectURL(file))
                  uploadAvatar(file)
                }
              }}
            />
          </div>

          {/* Username + bio */}
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 22,
              fontWeight: 800, marginBottom: 4
            }}>{user?.username}</h2>
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 10 }}>{user?.email}</p>

            {/* Bio */}
            {editingBio ? (
              <div>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                  maxLength={160}
                  style={{
                    width: '100%', padding: '8px 12px',
                    background: 'var(--bg3)', border: '1px solid var(--indigo)',
                    borderRadius: 8, color: 'var(--text)', fontSize: 13,
                    outline: 'none', resize: 'none', minHeight: 70,
                    lineHeight: 1.5, fontFamily: 'var(--font-body)'
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
                  <p style={{ fontSize: 11, color: 'var(--text2)', marginRight: 'auto', alignSelf: 'center' }}>
                    {bio.length}/160
                  </p>
                  <button onClick={() => { setEditingBio(false); setBio(user?.bio || '') }} style={{
                    padding: '5px 12px', background: 'none',
                    color: 'var(--text2)', border: '1px solid var(--border2)',
                    borderRadius: 8, cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    <X size={12} /> Cancel
                  </button>
                  <button onClick={saveBio} disabled={savingBio} style={{
                    padding: '5px 12px', background: 'var(--indigo)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    <Check size={12} /> {savingBio ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <p style={{
                  fontSize: 14, color: user?.bio ? 'var(--text)' : 'var(--text2)',
                  lineHeight: 1.5, flex: 1, fontStyle: user?.bio ? 'normal' : 'italic'
                }}>
                  {user?.bio || 'No bio yet — tell people about yourself!'}
                </p>
                <button onClick={() => setEditingBio(true)} style={{
                  background: 'none', border: 'none', color: 'var(--text2)',
                  cursor: 'pointer', padding: 4, flexShrink: 0
                }}>
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      
        {/* Followers and following */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          <button onClick={() => setShowFollowers(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              {stats?.followersCount || 0}
            </span>
            <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 4 }}>followers</span>
          </button>
          <button onClick={() => setShowFollowing(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              {stats?.followingCount || 0}
            </span>
            <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 4 }}>following</span>
          </button>
        </div>

        {/* Streak banner */}
        {stats?.streak?.current > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b22, #f59e0b11)',
            border: '1px solid #f59e0b44', borderRadius: 12,
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12
          }}>
            <Flame size={24} color="#f59e0b" />
            <div>
              <p style={{ fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>
                {stats.streak.current} day streak!
              </p>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                Longest: {stats.streak.longest} days
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Loading stats...</div>
      ) : (
        <div className="fade-up-3" style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12, marginBottom: 20
        }}>
          <StatCard icon={<Target size={22} color="var(--indigo)" />}
            value={stats?.goalsCount || 0} label="Total Goals" />
          <StatCard icon={<CheckCircle2 size={22} color="var(--green)" />}
            value={stats?.completedGoals || 0} label="Completed" color="var(--green)" />
          <StatCard icon={<Timer size={22} color="var(--indigo)" />}
            value={stats?.sessionsCount || 0} label="Sessions" />
          <StatCard icon={<Clock size={22} color="#f59e0b" />}
            value={`${stats?.totalFocusHours || 0}h`} label="Focus Time" color="#f59e0b" />
        </div>
      )}

      {/* Actions */}
      <div className="fade-up-4" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { icon: <Target size={16} />, label: 'My Goals', path: '/goals' },
          { icon: <Timer size={16} />, label: 'My Sessions', path: '/sessions' },
          { icon: <Clock size={16} />, label: 'Analytics', path: '/analytics' },
          { icon: <Crown size={16} />, label: 'Creator Subscriptions', path: '/creator-subscription' },
          { icon: <SettingsIcon size={16} />, label: 'Settings', path: '/settings' },
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)} style={{
            padding: '13px', background: 'var(--bg2)',
            color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 12, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.icon} {item.label}
            </span>
            <ChevronRight size={16} color="var(--text2)" />
          </button>
        ))}

        <button onClick={handleLogout} style={{
          padding: '13px', background: 'none',
          color: 'var(--red)', border: '1px solid var(--red)33',
          borderRadius: 12, fontSize: 14, fontWeight: 600,
          cursor: 'pointer', marginTop: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}>
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  )
}