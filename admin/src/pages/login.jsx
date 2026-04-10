import { useState } from 'react'
import axios from 'axios'

export default function Login({ onLogin }) {
    const [secret, setSecret] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        if (e) e.preventDefault()
        setLoading(true)
        setError('')
        try {
            console.log('submitting...', email, password)
            const res = await axios.post('https://flowspace-3ief.onrender.com/api/auth/login', { identifier: email, password })
            console.log('login response:', res.data)
            if (!res.data.user?.isAdmin) {
                setError('You are not an admin!')
                return
            }
            const success = onLogin(secret, res.data.accessToken)
            if (!success) setError('Wrong admin secret!')
        } catch (err) {
            console.log('error:', err)
            setError(err.response?.data?.error || 'Login failed')
        } finally { setLoading(false) }
    }
    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--bg)', padding: 24
        }}>
            <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 20, padding: 36, width: '100%', maxWidth: 400
            }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>⚡ Admin Login</h1>
                <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>FlowSpace Control Panel</p>

                {error && (
                    <div style={{
                        background: '#ef444415', border: '1px solid #ef444430',
                        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                        color: '#f87171', fontSize: 13
                    }}>{error}</div>
                )}

                <form >
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                            Admin Secret
                        </label>
                        <input
                            type="password" value={secret}
                            onChange={e => setSecret(e.target.value)}
                            placeholder="Enter admin secret"
                            style={{
                                width: '100%', padding: '10px 14px',
                                background: 'var(--bg3)', border: '1px solid var(--border2)',
                                borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Email</label>
                        <input
                            type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@flowspace.com"
                            style={{
                                width: '100%', padding: '10px 14px',
                                background: 'var(--bg3)', border: '1px solid var(--border2)',
                                borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Password</label>
                        <input
                            type="password" value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: '100%', padding: '10px 14px',
                                background: 'var(--bg3)', border: '1px solid var(--border2)',
                                borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '12px',
                            background: 'var(--indigo)', color: '#fff',
                            border: 'none', borderRadius: 10,
                            fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}>
                        {loading ? 'Logging in...' : 'Login →'}
                    </button>
                </form>
            </div>
        </div>
    )
}