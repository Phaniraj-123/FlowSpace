import { useState, useEffect } from 'react'
import axios from 'axios'

export default function Transactions({ token }) {
  const headers = { Authorization: `Bearer ${token}` }
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('${API}/api/admin/transactions', { headers })
      .then(res => setTransactions(res.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>💰 Transactions ({transactions.length})</h1>
      {loading ? <p style={{ color: 'var(--text2)' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transactions.map((t, i) => (
            <div key={i} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: t.type === 'credit' ? 'var(--green)' : '#ef4444'
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{t.description}</p>
                <p style={{ fontSize: 11, color: 'var(--text2)' }}>
                  @{t.user?.username} · {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p style={{
                fontWeight: 800, fontSize: 15,
                color: t.type === 'credit' ? 'var(--green)' : '#ef4444'
              }}>
                {t.type === 'credit' ? '+' : '-'}{t.amount} 🪙
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}