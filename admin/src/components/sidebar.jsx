import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, Radio, CreditCard, LogOut } from 'lucide-react'

const links = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/users', label: 'Users', icon: <Users size={18} /> },
  { path: '/posts', label: 'Posts', icon: <FileText size={18} /> },
  { path: '/streams', label: 'Live Streams', icon: <Radio size={18} /> },
  { path: '/transactions', label: 'Transactions', icon: <CreditCard size={18} /> },
]

export default function Sidebar({ onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div style={{
      width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: 20, minHeight: '100vh'
    }}>
      <div style={{
        fontFamily: 'monospace', fontSize: 18, fontWeight: 900,
        color: 'var(--indigo)', marginBottom: 32, letterSpacing: -1
      }}>
        ⚡ FlowSpace<br />
        <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>Admin Panel</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {links.map(link => (
          <button key={link.path} onClick={() => navigate(link.path)} style={{
            padding: '10px 14px', borderRadius: 10, border: 'none',
            background: location.pathname === link.path ? 'var(--indigo)' : 'none',
            color: location.pathname === link.path ? '#fff' : 'var(--text2)',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 14, fontWeight: 600, textAlign: 'left',
            cursor: 'pointer', transition: 'all 0.15s'
          }}
            onMouseEnter={e => { if (location.pathname !== link.path) e.currentTarget.style.background = 'var(--bg3)' }}
            onMouseLeave={e => { if (location.pathname !== link.path) e.currentTarget.style.background = 'none' }}
          >
            {link.icon} {link.label}
          </button>
        ))}
      </div>

      <button onClick={onLogout} style={{
        padding: '10px 14px', borderRadius: 10, border: 'none',
        background: 'none', color: '#ef4444',
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 14, fontWeight: 600, cursor: 'pointer'
      }}>
        <LogOut size={18} /> Logout
      </button>
    </div>
  )
}