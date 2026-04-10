import { useAuthStore } from '../store/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Home, Search, Bell, User, LogOut, Zap, TrendingUp, Trophy, MessageCircle, Radio, Coins, Menu, X, Target, Timer, Crown, Settings, ChevronLeft, Plus } from 'lucide-react'
import { useLiveStream } from '../context/LiveStreamContext'
import Avatar from './Avatar'
import API from "../api"

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [unread, setUnread] = useState(0)
  const [unreadDMs, setUnreadDMs] = useState(0)
  const [activeStream, setActiveStream] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { activeStreamId, isHosting } = useLiveStream()

  useEffect(() => {
    if (user) {
      fetchUnread()
      fetchUnreadDMs()
      checkActiveStream()
    }
    const interval = setInterval(() => {
      if (user) { fetchUnread(); fetchUnreadDMs(); checkActiveStream() }
    }, 30000)
    window.addEventListener('dm:read', fetchUnreadDMs)
    return () => { clearInterval(interval); window.removeEventListener('dm:read', fetchUnreadDMs) }
  }, [user])

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchUnread() {
    try {
      const token = useAuthStore.getState().token
      const res = await axios.get('https://flowspace-3ief.onrender.com/api/notifications/unread', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUnread(res.data.count || 0)
    } catch (err) { }
  }

  async function fetchUnreadDMs() {
    try {
      const token = useAuthStore.getState().token
      const res = await axios.get('https://flowspace-3ief.onrender.com/api/messages/unread', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUnreadDMs(res.data.count || 0)
    } catch (err) { }
  }

  async function checkActiveStream() {
    try {
      const token = useAuthStore.getState().token
      const currentUser = useAuthStore.getState().user
      if (!token || !currentUser) return
      const res = await axios.get('https://flowspace-3ief.onrender.com/api/livestream', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const myStream = res.data.find(s =>
        s.host?._id === currentUser._id || s.host?._id === currentUser.id ||
        s.host === currentUser._id || s.host === currentUser.id
      )
      setActiveStream(myStream || null)
    } catch (err) { }
  }

  function go(path) { navigate(path); setMenuOpen(false) }

  function handleLogout() { logout(); navigate('/login'); setMenuOpen(false) }

  const isActive = (path) => location.pathname === path

  function handlePlusPress() {
    if (location.pathname === '/feed') {
      // trigger feed's modal directly
      if (window.__openCreatePost) window.__openCreatePost()
    } else {
      navigate('/feed')
      // slight delay to let feed mount before opening modal
      setTimeout(() => { if (window.__openCreatePost) window.__openCreatePost() }, 300)
    }
  }

  const bottomNav = [
    { icon: <Radio size={22} />, path: '/live', label: 'Live' },
    { icon: <Search size={22} />, path: '/search', label: 'Search' },
    { icon: null, path: null, label: 'Create', isCreate: true }, // center + button
    { icon: <Coins size={22} />, path: '/monetization', label: 'Coins' },
    { icon: <User size={22} />, path: '/profile', label: 'Profile' },
  ]

  const menuItems = [
    { icon: <Home size={16} />, label: 'Feed', path: '/feed' },
    { icon: <Target size={16} />, label: 'Goals', path: '/goals' },
    { icon: <Timer size={16} />, label: 'Sessions', path: '/sessions' },
    { icon: <TrendingUp size={16} />, label: 'Analytics', path: '/analytics' },
    { icon: <Trophy size={16} />, label: 'Leaderboard', path: '/leaderboard' },
    { icon: <Crown size={16} />, label: 'Creator', path: '/creator-subscription' },
    { icon: <Settings size={16} />, label: 'Settings', path: '/settings' },
  ]

  return (
    <>
      <style>{`
        .nav-icon-btn {
          position: relative; background: none; border: none;
          cursor: pointer; padding: 6px;
          display: flex; align-items: center; transition: color 0.15s;
        }
        .bottom-nav-btn {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          background: none; border: none; cursor: pointer;
          padding: 6px 0; position: relative; transition: color 0.15s;
        }
        .create-btn {
          width: 48px; height: 48px; border-radius: 16px;
          background: var(--indigo);
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer;
          box-shadow: 0 4px 16px var(--indigo)66;
          transition: transform 0.15s, box-shadow 0.15s;
          margin-bottom: 8px;
        }
        .create-btn:active { transform: scale(0.92); }
      `}</style>

      {/* TOP BAR */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        height: 58, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px'
      }}>
        {/* Logo + back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!['/live', '/feed', '/search', '/monetization', '/profile'].includes(location.pathname) && (
            <button onClick={() => navigate(-1)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text2)', display: 'flex', alignItems: 'center', padding: '6px'
            }}>
              <ChevronLeft size={22} />
            </button>
          )}
          <div onClick={() => go('/live')} style={{
            fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 900,
            cursor: 'pointer', letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, var(--indigo), #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            FlowSpace
          </div>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} ref={menuRef}>
          {/* Notifications */}
          <button className="nav-icon-btn" onClick={() => go('/notifications')}
            style={{ color: isActive('/notifications') ? 'var(--indigo)' : 'var(--text2)' }}>
            <Bell size={20} />
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                background: 'var(--red)', color: '#fff',
                borderRadius: 20, padding: '1px 5px', fontSize: 10, fontWeight: 700,
                minWidth: 16, textAlign: 'center'
              }}>{unread}</span>
            )}
          </button>

          {/* Messages */}
          <button className="nav-icon-btn" onClick={() => go('/messages')}
            style={{ color: isActive('/messages') ? 'var(--indigo)' : 'var(--text2)' }}>
            <MessageCircle size={20} />
            {unreadDMs > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0,
                background: 'var(--red)', color: '#fff',
                borderRadius: 20, padding: '1px 5px', fontSize: 10, fontWeight: 700,
                minWidth: 16, textAlign: 'center'
              }}>{unreadDMs}</span>
            )}
          </button>

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(prev => !prev)} style={{
            background: menuOpen ? 'var(--bg2)' : 'none',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
            color: 'var(--text)', display: 'flex', alignItems: 'center'
          }}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div style={{
              position: 'absolute', top: 58, right: 0,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '0 0 16px 16px', minWidth: 220,
              boxShadow: '0 8px 32px #0006', zIndex: 200, overflow: 'hidden'
            }}>
              {/* User info */}
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <Avatar src={user?.avatar} name={user?.username} size={36} tier={user?.subscriptionTier} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{user?.username}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)' }}>{user?.email}</p>
                </div>
              </div>

              {menuItems.map(item => (
                <button key={item.path} onClick={() => go(item.path)} style={{
                  width: '100%', padding: '12px 16px',
                  background: isActive(item.path) ? 'var(--bg2)' : 'none',
                  color: isActive(item.path) ? 'var(--text)' : 'var(--text2)',
                  border: 'none', cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', gap: 10,
                  textAlign: 'left', transition: 'background 0.1s',
                  borderLeft: isActive(item.path) ? '3px solid var(--indigo)' : '3px solid transparent'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = isActive(item.path) ? 'var(--bg2)' : 'none'}
                >
                  {item.icon}{item.label}
                </button>
              ))}

              <button onClick={handleLogout} style={{
                width: '100%', padding: '12px 16px',
                background: 'none', color: '#ef4444',
                border: 'none', borderTop: '1px solid var(--border)',
                cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left'
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#ef444411'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* BOTTOM NAV */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'var(--bg)', borderTop: '1px solid var(--border)',
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-around', padding: '0 8px'
      }}>
        {bottomNav.map((item, idx) => {
          if (item.isCreate) {
            return (
              <div key="create" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <button className="create-btn" onClick={handlePlusPress}>
                  <Plus size={22} color="#fff" strokeWidth={2.5} />
                </button>
              </div>
            )
          }
          return (
            <button key={item.path} className="bottom-nav-btn" onClick={() => go(item.path)}
              style={{ color: isActive(item.path) ? 'var(--indigo)' : 'var(--text2)' }}>
              {item.icon}
              <span style={{ fontSize: 10, fontWeight: isActive(item.path) ? 700 : 400 }}>
                {item.label}
              </span>
              {isActive(item.path) && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24, height: 3, borderRadius: 3, background: 'var(--indigo)'
                }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Live bubble */}
      {activeStreamId && isHosting && (
        <div onClick={() => navigate(`/live/${activeStreamId}?host=true`)} style={{
          position: 'fixed', bottom: 76, right: 16,
          background: 'var(--red)', color: '#fff',
          padding: '10px 16px', borderRadius: 30,
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', zIndex: 150,
          boxShadow: '0 4px 20px #ef444466'
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#fff', animation: 'pulse-ring 1.5s infinite'
          }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>You're Live!</span>
          <span style={{ fontSize: 11, opacity: 0.8 }}>Tap to return</span>
        </div>
      )}

      <div style={{ height: 58 }} />
    </>
  )
}