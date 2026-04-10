import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { Moon, Bell, Lock, Trash2, Key, Monitor, User } from 'lucide-react'
import API from "../api"


export default function Settings() {
  const { token, user, updateUser, logout } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()

  const [tab, setTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [displayName, setDisplayName] = useState(user?.name || '')
  const [newUsername, setNewUsername] = useState(user?.username || '')
  const [profileMsg, setProfileMsg] = useState('')

  const [theme, setTheme] = useState('dark')
  const [notifs, setNotifs] = useState({ likes: true, comments: true, follows: true, messages: true, donations: true })
  const [privacy, setPrivacy] = useState({ isPrivate: false, showOnlineStatus: true })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [sessions, setSessions] = useState([])
  const [blockedUsers, setBlockedUsers] = useState([])

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    try {
      const res = await axios.get('https://flowspace-3ief.onrender.com/api/settings', { headers })
      setTheme(res.data.settings?.theme || 'dark')
      setNotifs(res.data.settings?.notifications || notifs)
      setPrivacy(res.data.settings?.privacy || privacy)
      setBlockedUsers(res.data.blockedUsers || [])
      setSessions(res.data.sessions || [])
      const meRes = await axios.get('https://flowspace-3ief.onrender.com/api/users/me', { headers })
      setDisplayName(meRes.data.name || '')
      setNewUsername(meRes.data.username || '')
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function saveProfile() {
    if (!newUsername.trim()) return setProfileMsg('Username cannot be empty')
    if (newUsername.length < 3) return setProfileMsg('Username must be at least 3 characters')
    setSaving(true)
    try {
      const freshToken = useAuthStore.getState().token
      const res = await axios.put('https://flowspace-3ief.onrender.com/api/settings/profile',
        { name: displayName, username: newUsername },
        { headers: { Authorization: `Bearer ${freshToken}` } })
      updateUser({ name: res.data.name, username: res.data.username })
      setProfileMsg(' Profile updated!')
    } catch (err) {
      setProfileMsg(err.response?.data?.error || 'Failed to update profile')
    } finally { setSaving(false) }
  }

  async function saveTheme(newTheme) {
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
    try {
      await axios.put('https://flowspace-3ief.onrender.com/api/settings/theme', { theme: newTheme }, { headers })
    } catch (err) { console.log(err) }
  }

  async function saveNotifications() {
    setSaving(true)
    try {
      await axios.put('https://flowspace-3ief.onrender.com/api/settings/notifications', { notifications: notifs }, { headers })
      alert(' Notification settings saved!')
    } catch (err) { console.log(err) }
    finally { setSaving(false) }
  }

  async function savePrivacy() {
    setSaving(true)
    try {
      await axios.put('https://flowspace-3ief.onrender.com/api/settings/privacy', { privacy }, { headers })
      alert(' Privacy settings saved!')
    } catch (err) { console.log(err) }
    finally { setSaving(false) }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) return setPasswordMsg('All fields are required')
    if (newPassword !== confirmPassword) return setPasswordMsg('Passwords do not match')
    if (newPassword.length < 6) return setPasswordMsg('Password must be at least 6 characters')
    setSaving(true)
    try {
      await axios.put('https://flowspace-3ief.onrender.com/api/settings/password', { currentPassword, newPassword }, { headers })
      setPasswordMsg(' Password changed successfully!')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      setPasswordMsg(err.response?.data?.error || 'Failed to change password')
    } finally { setSaving(false) }
  }

  async function unblockUser(userId) {
    try {
      await axios.delete(`${API}/api/settings/block/${userId}`, { headers })
      setBlockedUsers(prev => prev.filter(u => u._id !== userId))
    } catch (err) { console.log(err) }
  }

  async function revokeSession(sessionId) {
    try {
      await axios.delete(`${API}/api/settings/sessions/${sessionId}`, { headers })
      setSessions(prev => prev.filter(s => s._id !== sessionId))
    } catch (err) { console.log(err) }
  }

  async function deleteAccount() {
    if (!deletePassword) return alert('Enter your password')
    try {
      await axios.delete('https://flowspace-3ief.onrender.com/api/settings/account', { data: { password: deletePassword }, headers })
      logout(); navigate('/login')
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete account') }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'theme', label: 'Theme', icon: <Moon size={16} /> },
    { id: 'notifications', label: 'Notifs', icon: <Bell size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Lock size={16} /> },
    { id: 'password', label: 'Password', icon: <Key size={16} /> },
    { id: 'sessions', label: 'Sessions', icon: <Monitor size={16} /> },
    { id: 'danger', label: 'Danger', icon: <Trash2 size={16} /> },
  ]

  const Toggle = ({ value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12,
      background: value ? 'var(--indigo)' : 'var(--bg3)',
      border: `1px solid ${value ? 'var(--indigo)' : 'var(--border2)'}`,
      cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2, left: value ? 22 : 2,
        transition: 'left 0.2s', boxShadow: '0 1px 4px #0004'
      }} />
    </div>
  )

  const inputStyle = {
    width: '100%', padding: '10px 14px',
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box'
  }

  const saveBtn = (onClick, label) => (
    <button onClick={onClick} disabled={saving} style={{
      marginTop: 20, padding: '11px 28px', background: 'var(--indigo)',
      color: '#fff', border: 'none', borderRadius: 10,
      fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1
    }}>{saving ? 'Saving...' : label}</button>
  )

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading...</div>

  return (
    <>
      <style>{`
        .settings-root {
          max-width: 820px;
          margin: 0 auto;
          padding: 24px 16px 100px;
        }
        .settings-layout {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }
        .settings-sidebar {
          width: 180px;
          flex-shrink: 0;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 8px;
          height: fit-content;
          position: sticky;
          top: 80px;
        }
        .settings-content { flex: 1; min-width: 0; }
        .settings-tab-btn {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 2px;
          text-align: left;
          transition: all 0.15s;
        }
        /* Mobile: horizontal scrollable tabs instead of sidebar */
        .settings-mobile-tabs {
          display: none;
          overflow-x: auto;
          gap: 8px;
          padding-bottom: 4px;
          margin-bottom: 16px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .settings-mobile-tabs::-webkit-scrollbar { display: none; }
        .settings-mobile-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        @media (max-width: 600px) {
          .settings-layout { flex-direction: column; }
          .settings-sidebar { display: none; }
          .settings-mobile-tabs { display: flex; }
          .settings-root { padding: 16px 12px 100px; }
        }
        .card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
        }
        .card-title {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 18px;
        }
        .row-divider {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
      `}</style>

      <div className="settings-root">
        <h1 className="fade-up" style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 20
        }}>⚙️ Settings</h1>

        {/* Mobile tab bar */}
        <div className="settings-mobile-tabs">
          {tabs.map(t => (
            <button key={t.id} className="settings-mobile-tab" onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? 'var(--indigo)' : 'var(--bg2)',
              color: tab === t.id ? '#fff' : 'var(--text2)',
              border: `1px solid ${tab === t.id ? 'var(--indigo)' : 'var(--border)'}`
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="settings-layout">
          {/* Desktop sidebar */}
          <div className="settings-sidebar">
            {tabs.map(t => (
              <button key={t.id} className="settings-tab-btn" onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? 'var(--indigo)' : 'none',
                color: tab === t.id ? '#fff' : 'var(--text2)',
              }}>
                {t.icon} {t.label === 'Notifs' ? 'Notifications' : t.label === 'Danger' ? 'Danger Zone' : t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="settings-content">

            {/* PROFILE */}
            {tab === 'profile' && (
              <div className="card">
                <p className="card-title">Edit Profile</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Display Name</label>
                    <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your display name" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border2)'} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Username</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', fontSize: 14 }}>@</span>
                      <input value={newUsername}
                        onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="username"
                        style={{ ...inputStyle, paddingLeft: 28 }}
                        onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border2)'} />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>Lowercase letters, numbers and underscores only</p>
                  </div>
                </div>
                {profileMsg && (
                  <p style={{ fontSize: 13, marginTop: 12, color: profileMsg.includes('✅') ? 'var(--green)' : '#ef4444' }}>
                    {profileMsg}
                  </p>
                )}
                {saveBtn(saveProfile, 'Save Changes')}
              </div>
            )}

            {/* THEME */}
            {tab === 'theme' && (
              <div className="card">
                <p className="card-title">Appearance</p>
                <div style={{ display: 'flex', gap: 14 }}>
                  {['dark', 'light'].map(t => (
                    <div key={t} onClick={() => saveTheme(t)} style={{
                      flex: 1, padding: '16px 12px', borderRadius: 14, cursor: 'pointer',
                      background: t === 'dark' ? '#080810' : '#f8fafc',
                      border: `2px solid ${theme === t ? 'var(--indigo)' : 'var(--border)'}`,
                      textAlign: 'center', transition: 'all 0.15s'
                    }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{t === 'dark' ? '🌙' : '☀️'}</div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: t === 'dark' ? '#fff' : '#1a1a2e' }}>
                        {t === 'dark' ? 'Dark' : 'Light'}
                      </p>
                      {theme === t && <p style={{ fontSize: 11, color: 'var(--indigo)', marginTop: 4 }}>✓ Active</p>}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 14 }}>
                  💡 Light mode coming soon.
                </p>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {tab === 'notifications' && (
              <div className="card">
                <p className="card-title">Notification Preferences</p>
                {[
                  { key: 'likes', label: 'Likes', desc: 'When someone likes your post' },
                  { key: 'comments', label: 'Comments', desc: 'When someone comments on your post' },
                  { key: 'follows', label: 'Follows', desc: 'When someone follows you' },
                  { key: 'messages', label: 'Messages', desc: 'When you receive a direct message' },
                  { key: 'donations', label: 'Donations', desc: 'When someone sends you coins' },
                ].map(item => (
                  <div key={item.key} className="row-divider">
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)' }}>{item.desc}</p>
                    </div>
                    <Toggle value={notifs[item.key]} onChange={val => setNotifs(prev => ({ ...prev, [item.key]: val }))} />
                  </div>
                ))}
                {saveBtn(saveNotifications, 'Save Preferences')}
              </div>
            )}

            {/* PRIVACY */}
            {tab === 'privacy' && (
              <div className="card">
                <p className="card-title">Privacy Settings</p>
                <div className="row-divider">
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>Private Account</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)' }}>Only followers can see your posts</p>
                  </div>
                  <Toggle value={privacy.isPrivate} onChange={val => setPrivacy(prev => ({ ...prev, isPrivate: val }))} />
                </div>
                <div className="row-divider">
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>Show Online Status</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)' }}>Let others see when you're online</p>
                  </div>
                  <Toggle value={privacy.showOnlineStatus} onChange={val => setPrivacy(prev => ({ ...prev, showOnlineStatus: val }))} />
                </div>
                {saveBtn(savePrivacy, 'Save Privacy Settings')}

                {blockedUsers.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Blocked Users ({blockedUsers.length})</h4>
                    {blockedUsers.map(u => (
                      <div key={u._id} className="row-divider">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar src={u.avatar} name={u.username} size={36} />
                          <p style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</p>
                        </div>
                        <button onClick={() => unblockUser(u._id)} style={{
                          padding: '6px 14px', background: 'none',
                          color: 'var(--indigo)', border: '1px solid var(--indigo)44',
                          borderRadius: 8, cursor: 'pointer', fontSize: 12
                        }}>Unblock</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PASSWORD */}
            {tab === 'password' && (
              <div className="card">
                <p className="card-title">Change Password</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Current Password', value: currentPassword, onChange: setCurrentPassword },
                    { label: 'New Password', value: newPassword, onChange: setNewPassword },
                    { label: 'Confirm New Password', value: confirmPassword, onChange: setConfirmPassword },
                  ].map(field => (
                    <div key={field.label}>
                      <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>{field.label}</label>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Toggle value={showPasswords} onChange={setShowPasswords} />
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>Show passwords</span>
                  </div>
                </div>
                {passwordMsg && (
                  <p style={{ fontSize: 13, marginTop: 12, color: passwordMsg.includes('✅') ? 'var(--green)' : '#ef4444' }}>
                    {passwordMsg}
                  </p>
                )}
                {saveBtn(changePassword, 'Update Password')}
              </div>
            )}

            {/* SESSIONS */}
            {tab === 'sessions' && (
              <div className="card">
                <p className="card-title">Active Sessions</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                  Devices currently logged into your account
                </p>
                {sessions.length === 0 && (
                  <p style={{ color: 'var(--text2)', fontSize: 13 }}>No session data available yet.</p>
                )}
                {sessions.map(s => (
                  <div key={s._id} className="row-divider">
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{s.device || 'Unknown Device'}</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                        IP: {s.ip || 'Unknown'} · {new Date(s.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                    <button onClick={() => revokeSession(s._id)} style={{
                      padding: '6px 14px', background: 'none', color: '#ef4444',
                      border: '1px solid #ef444444', borderRadius: 8, cursor: 'pointer', fontSize: 12
                    }}>Revoke</button>
                  </div>
                ))}
              </div>
            )}

            {/* DANGER */}
            {tab === 'danger' && (
              <div className="card" style={{ border: '1px solid #ef444433' }}>
                <p className="card-title" style={{ color: '#ef4444' }}>⚠️ Danger Zone</p>
                <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
                  These actions are permanent and cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button onClick={() => setShowDeleteConfirm(true)} style={{
                    padding: '12px 24px', background: '#ef444422',
                    color: '#ef4444', border: '1px solid #ef444444',
                    borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700
                  }}>🗑️ Delete My Account</button>
                ) : (
                  <div style={{ background: '#ef444411', border: '1px solid #ef444433', borderRadius: 14, padding: 20 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#ef4444', marginBottom: 8 }}>Are you absolutely sure?</p>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
                      This will permanently delete your account, posts, messages, and all data.
                    </p>
                    <input type="password" value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      placeholder="Enter your password to confirm"
                      style={{ ...inputStyle, marginBottom: 14, border: '1px solid #ef444444' }} />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setShowDeleteConfirm(false)} style={{
                        flex: 1, padding: '10px', background: 'none', color: 'var(--text2)',
                        border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: 13
                      }}>Cancel</button>
                      <button onClick={deleteAccount} style={{
                        flex: 2, padding: '10px', background: '#ef4444', color: '#fff',
                        border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700
                      }}>Yes, Delete My Account</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}