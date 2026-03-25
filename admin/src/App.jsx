import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Posts from './pages/Posts'
import Streams from './pages/Streams'
import Transactions from './pages/Transactions'
import Sidebar from './components/sidebar'

const ADMIN_SECRET = 'flowspace-admin-2024'

export default function App() {
  const [authed, setAuthed] = useState(
    localStorage.getItem('admin-authed') === 'true'
  )
  const [token, setToken] = useState(localStorage.getItem('admin-token') || '')

  function handleLogin(secret, adminToken) {
    if (secret !== ADMIN_SECRET) return false
    localStorage.setItem('admin-authed', 'true')
    localStorage.setItem('admin-token', adminToken)
    setAuthed(true)
    setToken(adminToken)
    return true
  }

  function handleLogout() {
    localStorage.removeItem('admin-authed')
    localStorage.removeItem('admin-token')
    setAuthed(false)
    setToken('')
  }

  if (!authed) return <Login onLogin={handleLogin} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar onLogout={handleLogout} />
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard token={token} />} />
          <Route path="/users" element={<Users token={token} />} />
          <Route path="/posts" element={<Posts token={token} />} />
          <Route path="/streams" element={<Streams token={token} />} />
          <Route path="/transactions" element={<Transactions token={token} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}