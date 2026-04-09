import { useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import API from "../api"

export default function Login() {
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await axios.post('${API}/api/auth/login', form)
      login(res.data.user, res.data.accessToken)
      navigate('/live')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, #6366f118 0%, transparent 70%)',
      padding: 24
    }}>
      {/* Grid lines bg */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '60px 60px', opacity: 0.3
      }} />

      <div className="fade-up" style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12,
            fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text)'
          }}>
            <span style={{
              width: 40, height: 40, background: 'var(--indigo)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20
            }}>⚡</span>
            FlowSpace
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 36,
          boxShadow: '0 0 0 1px #6366f110, 0 32px 64px #00000060'
        }}>
          {error && (
            <div style={{
              background: '#ef444415', border: '1px solid #ef444430', borderRadius: 10,
              padding: '10px 14px', marginBottom: 20, color: '#f87171', fontSize: 14
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Email or Phone</label>
              <input
                type="text" value={form.identifier}
                onChange={e => setForm({ ...form, identifier: e.target.value })}
                placeholder="you@example.com or 9876566555"
                style={{
                  width: '100%', padding: '11px 14px',
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Password</label>
              <input
                type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '11px 14px',
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px',
              background: loading ? 'var(--border2)' : 'var(--indigo)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600, transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text2)', fontSize: 14 }}>
            No account?{' '}
            <span onClick={() => navigate('/register')} style={{ color: 'var(--indigo-light)', fontWeight: 600, cursor: 'pointer' }}>Create one</span>
          </p>
        </div>
      </div>
    </div>
  )
}