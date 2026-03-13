import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { Moon, Sun, Bell, Lock, Trash2, Key, Monitor, ChevronRight, X, Check, Eye, EyeOff } from 'lucide-react'

export default function Settings() {
  const { token, user, updateUser, logout } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()

  const [tab, setTab] = useState('theme')
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // theme
  const [theme, setTheme] = useState('dark')

  // notifications
  const [notifs, setNotifs] = useState({
    likes: true, comments: true, follows: true,
    messages: true, donations: true
  })

  // privacy
  const [privacy, setPrivacy] = useState({
    isPrivate: false, showOnlineStatus: true
  })

  // password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')

  // delete account
  const [deletePassword, setDeletePassword] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // sessions
  const [sessions, setSessions] = useState([])

  // blocked users
  const [blockedUsers, setBlockedUsers] = useState([])

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await axios.get('http://localhost:5000/api/settings', { headers })
      setSettings(res.data)
      setTheme(res.data.settings?.theme || 'dark')
      setNotifs(res.data.settings?.notifications || notifs)
      setPrivacy(res.data.settings?.privacy || privacy)
      setBlockedUsers(res.data.blockedUsers || [])
      setSessions(res.data.sessions || [])
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function saveTheme(newTheme) {
    setTheme(newTheme)
    // apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme)
    try {
      await axios.put('http://localhost:5000/api/settings/theme', { theme: newTheme }, { headers })
    } catch (err) { console.log(err) }
  }

  async function saveNotifications() {
    setSaving(true)
    try {
      await axios.put('http://localhost:5000/api/settings/notifications', { notifications: notifs }, { headers })
      alert('✅ Notification settings saved!')
    } catch (err) { console.log(err) }
    finally { setSaving(false) }
  }

  async function savePrivacy() {
    setSaving(true)
    try {
      await axios.put('http://localhost:5000/api/settings/privacy', { privacy }, { headers })
      alert('✅ Privacy settings saved!')
    } catch (err) { console.log(err) }
    finally { setSaving(false) }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword)
      return setPasswordMsg('All fields are required')
    if (newPassword !== confirmPassword)
      return setPasswordMsg('Passwords do not match')
    if (newPassword.length < 6)
      return setPasswordMsg('Password must be at least 6 characters')
    setSaving(true)
    try {
      await axios.put('http://localhost:5000/api/settings/password',
        { currentPassword, newPassword }, { headers })
      setPasswordMsg('✅ Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordMsg(err.response?.data?.error || 'Failed to change password')
    } finally { setSaving(false) }
  }

  async function unblockUser(userId) {
    try {
      await axios.delete(`http://localhost:5000/api/settings/block/${userId}`, { headers })
      setBlockedUsers(prev => prev.filter(u => u._id !== userId))
    } catch (err) { console.log(err) }
  }

  async function revokeSession(sessionId) {
    try {
      await axios.delete(`http://localhost:5000/api/settings/sessions/${sessionId}`, { headers })
      setSessions(prev => prev.filter(s => s._id !== sessionId))
    } catch (err) { console.log(err) }
  }

  async function deleteAccount() {
    if (!deletePassword) return alert('Enter your password')
    try {
      await axios.delete('http://localhost:5000/api/settings/account',
        { data: { password: deletePassword }, headers })
      logout()
      navigate('/login')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete account')
    }
  }

  const tabs = [
    { id: 'theme', label: 'Theme', icon: <Moon size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Lock size={16} /> },
    { id: 'password', label: 'Password', icon: <Key size={16} /> },
    { id: 'sessions', label: 'Sessions', icon: <Monitor size={16} /> },
    { id: 'danger', label: 'Danger Zone', icon: <Trash2 size={16} /> },
  ]

  const Toggle = ({ value, onChange }) => (
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12,
      background: value ? 'var(--indigo)' : 'var(--bg3)',
      border: `1px solid ${value ? 'var(--indigo)' : 'var(--border2)'}`,
      cursor: 'pointer', position: 'relative', transition: 'all 0.2s', flexShrink: 0
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', position: 'absolute',
        top: 2, left: value ? 22 : 2,
        transition: 'left 0.2s', boxShadow: '0 1px 4px #0004'
      }} />
    </div>
  )

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 100px' }}>
      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 28
      }}>⚙️ Settings</h1>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Sidebar */}
        <div style={{
          width: 200, flexShrink: 0,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 8, height: 'fit-content'
        }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              width: '100%', padding: '10px 14px', borderRadius: 10,
              background: tab === t.id ? 'var(--indigo)' : 'none',
              color: tab === t.id ? '#fff' : 'var(--text2)',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 2, textAlign: 'left', transition: 'all 0.15s'
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>

          {/* THEME */}
          {tab === 'theme' && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                Appearance
              </h3>
              <div style={{ display: 'flex', gap: 14 }}>
                {['dark', 'light'].map(t => (
                  <div key={t} onClick={() => saveTheme(t)} style={{
                    flex: 1, padding: 20, borderRadius: 14, cursor: 'pointer',
                    background: t === 'dark' ? '#080810' : '#f8fafc',
                    border: `2px solid ${theme === t ? 'var(--indigo)' : 'var(--border)'}`,
                    textAlign: 'center', transition: 'all 0.15s'
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>
                      {t === 'dark' ? '🌙' : '☀️'}
                    </div>
                    <p style={{
                      fontWeight: 700, fontSize: 14,
                      color: t === 'dark' ? '#fff' : '#1a1a2e'
                    }}>
                      {t === 'dark' ? 'Dark' : 'Light'}
                    </p>
                    {theme === t && (
                      <p style={{ fontSize: 11, color: 'var(--indigo)', marginTop: 4 }}>✓ Active</p>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 16 }}>
                💡 Light mode coming soon — full CSS variables support in progress.
              </p>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === 'notifications' && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                Notification Preferences
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { key: 'likes', label: 'Likes', desc: 'When someone likes your post' },
                  { key: 'comments', label: 'Comments', desc: 'When someone comments on your post' },
                  { key: 'follows', label: 'Follows', desc: 'When someone follows you' },
                  { key: 'messages', label: 'Messages', desc: 'When you receive a direct message' },
                  { key: 'donations', label: 'Donations', desc: 'When someone sends you coins' },
                ].map(item => (
                  <div key={item.key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 0', borderBottom: '1px solid var(--border)'
                  }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)' }}>{item.desc}</p>
                    </div>
                    <Toggle
                      value={notifs[item.key]}
                      onChange={val => setNotifs(prev => ({ ...prev, [item.key]: val }))}
                    />
                  </div>
                ))}
              </div>
              <button onClick={saveNotifications} disabled={saving} style={{
                marginTop: 20, padding: '11px 28px', background: 'var(--indigo)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* PRIVACY */}
          {tab === 'privacy' && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24, marginBottom: 16
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                Privacy Settings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>Private Account</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)' }}>Only followers can see your posts</p>
                  </div>
                  <Toggle
                    value={privacy.isPrivate}
                    onChange={val => setPrivacy(prev => ({ ...prev, isPrivate: val }))}
                  />
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>Show Online Status</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)' }}>Let others see when you're online</p>
                  </div>
                  <Toggle
                    value={privacy.showOnlineStatus}
                    onChange={val => setPrivacy(prev => ({ ...prev, showOnlineStatus: val }))}
                  />
                </div>
              </div>
              <button onClick={savePrivacy} disabled={saving} style={{
                padding: '11px 28px', background: 'var(--indigo)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer'
              }}>
                {saving ? 'Saving...' : 'Save Privacy Settings'}
              </button>

              {/* Blocked users */}
              {blockedUsers.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                    Blocked Users ({blockedUsers.length})
                  </h4>
                  {blockedUsers.map(u => (
                    <div key={u._id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--border)'
                    }}>
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
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                Change Password
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Current Password', value: currentPassword, onChange: setCurrentPassword },
                  { label: 'New Password', value: newPassword, onChange: setNewPassword },
                  { label: 'Confirm New Password', value: confirmPassword, onChange: setConfirmPassword },
                ].map(field => (
                  <div key={field.label}>
                    <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                      {field.label}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        value={field.value}
                        onChange={e => field.onChange(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 40px 10px 14px',
                          background: 'var(--bg3)', border: '1px solid var(--border2)',
                          borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                      />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Toggle value={showPasswords} onChange={setShowPasswords} />
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>Show passwords</span>
                </div>
              </div>
              {passwordMsg && (
                <p style={{
                  fontSize: 13, marginTop: 12,
                  color: passwordMsg.includes('✅') ? 'var(--green)' : '#ef4444'
                }}>{passwordMsg}</p>
              )}
              <button onClick={changePassword} disabled={saving} style={{
                marginTop: 20, padding: '11px 28px', background: 'var(--indigo)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}>
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}

          {/* SESSIONS */}
          {tab === 'sessions' && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Active Sessions
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
                These are the devices currently logged into your account
              </p>
              {sessions.length === 0 && (
                <p style={{ color: 'var(--text2)', fontSize: 13 }}>
                  No session data available yet. Sessions are tracked on login.
                </p>
              )}
              {sessions.map(s => (
                <div key={s._id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14 }}>{s.device || 'Unknown Device'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                      IP: {s.ip || 'Unknown'} · Last active: {new Date(s.lastActive).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => revokeSession(s._id)} style={{
                    padding: '6px 14px', background: 'none',
                    color: '#ef4444', border: '1px solid #ef444444',
                    borderRadius: 8, cursor: 'pointer', fontSize: 12
                  }}>Revoke</button>
                </div>
              ))}
            </div>
          )}

          {/* DANGER ZONE */}
          {tab === 'danger' && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid #ef444433',
              borderRadius: 16, padding: 24
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
                ⚠️ Danger Zone
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 24 }}>
                These actions are permanent and cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} style={{
                  padding: '12px 24px', background: '#ef444422',
                  color: '#ef4444', border: '1px solid #ef444444',
                  borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700
                }}>
                  🗑️ Delete My Account
                </button>
              ) : (
                <div style={{
                  background: '#ef444411', border: '1px solid #ef444433',
                  borderRadius: 14, padding: 20
                }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#ef4444', marginBottom: 8 }}>
                    Are you absolutely sure?
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
                    This will permanently delete your account, posts, messages, and all data. This cannot be undone.
                  </p>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="Enter your password to confirm"
                    style={{
                      width: '100%', padding: '10px 14px', marginBottom: 14,
                      background: 'var(--bg3)', border: '1px solid #ef444444',
                      borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setShowDeleteConfirm(false)} style={{
                      flex: 1, padding: '10px', background: 'none',
                      color: 'var(--text2)', border: '1px solid var(--border)',
                      borderRadius: 10, cursor: 'pointer', fontSize: 13
                    }}>Cancel</button>
                    <button onClick={deleteAccount} style={{
                      flex: 2, padding: '10px', background: '#ef4444',
                      color: '#fff', border: 'none', borderRadius: 10,
                      cursor: 'pointer', fontSize: 13, fontWeight: 700
                    }}>
                      Yes, Delete My Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}