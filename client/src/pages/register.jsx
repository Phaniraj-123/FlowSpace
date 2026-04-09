import { useState } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Basic phone validation
    if (!/^\+?[0-9]{7,15}$/.test(form.phone)) {
      setError('Enter a valid phone number')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', form)
      login(res.data.user, res.data.accessToken)
      navigate('/live')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    borderRadius: 10, color: 'var(--text)', fontSize: 15, outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box'
  }

  const fields = [
    { key: 'username', label: 'Username', type: 'text', placeholder: 'coolstreamer' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
    { key: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+91 98765 43210' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
  ]

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, #6366f118 0%, transparent 70%)',
      padding: 24
    }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '60px 60px', opacity: 0.3
      }} />

      <div className="fade-up" style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
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
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Create your account</p>
        </div>

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
            {fields.map(({ key, label, type, placeholder }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  placeholder={placeholder}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                  required
                />
              </div>
            ))}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', marginTop: 8,
              background: loading ? 'var(--border2)' : 'var(--indigo)',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600, transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1, cursor: loading ? 'default' : 'pointer'
            }}>
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text2)', fontSize: 14 }}>
            Already have an account?{' '}
            <span onClick={() => navigate('/login')} style={{ color: 'var(--indigo-light)', fontWeight: 600, cursor: 'pointer' }}>
              Sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}