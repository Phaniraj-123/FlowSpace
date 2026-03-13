import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { Coins, TrendingUp, Users, Gift, ArrowDownCircle, Zap, Crown, Star } from 'lucide-react'

const TIER_COLORS = { basic: '#6366f1', pro: '#f59e0b', vip: '#ef4444' }
const TIER_ICONS = { basic: '⭐', pro: '🔥', vip: '👑' }

export default function Monetization() {
  const { token, user } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()

  const [tab, setTab] = useState('wallet')
  const [wallet, setWallet] = useState(null)
  const [packages, setPackages] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState(100)
  const [withdrawMethod, setWithdrawMethod] = useState('UPI')
  const [withdrawDetails, setWithdrawDetails] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      const [walletRes, pkgRes, subsRes, subersRes] = await Promise.all([
        axios.get('http://localhost:5000/api/monetization/wallet', { headers }),
        axios.get('http://localhost:5000/api/monetization/packages', { headers }),
        axios.get('http://localhost:5000/api/monetization/my-subscriptions', { headers }),
        axios.get('http://localhost:5000/api/monetization/my-subscribers', { headers }),
      ])
      setWallet(walletRes.data)
      setPackages(pkgRes.data)
      setSubscriptions(subsRes.data)
      setSubscribers(subersRes.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function buyCoins(pkg) {
    setBuying(pkg.id)
    try {
      const res = await axios.post('http://localhost:5000/api/monetization/buy-coins',
        { packageId: pkg.id }, { headers })
      setWallet(prev => ({ ...prev, balance: res.data.newBalance }))
      alert(`✅ Added ${res.data.coinsAdded} coins to your wallet!`)
    } catch (err) {
      alert(err.response?.data?.error || 'Purchase failed')
    } finally { setBuying(null) }
  }

  async function cancelSub(creatorId) {
    try {
      await axios.delete(`http://localhost:5000/api/monetization/subscribe/${creatorId}`, { headers })
      setSubscriptions(prev => prev.filter(s => s.creator._id !== creatorId))
    } catch (err) { console.log(err) }
  }

  async function requestWithdraw() {
    if (!withdrawDetails.trim()) return alert('Please enter payment details')
    setWithdrawing(true)
    try {
      const res = await axios.post('http://localhost:5000/api/monetization/withdraw',
        { amount: withdrawAmount, method: withdrawMethod, details: withdrawDetails }, { headers })
      setWallet(prev => ({ ...prev, balance: res.data.newBalance }))
      setShowWithdraw(false)
      alert('✅ Withdrawal request submitted! We will process it within 3-5 business days.')
    } catch (err) {
      alert(err.response?.data?.error || 'Withdrawal failed')
    } finally { setWithdrawing(false) }
  }

  const tabs = ['wallet', 'buy coins', 'subscriptions', 'subscribers', 'withdraw']

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 100px' }}>

      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 8
      }}>💰 Monetization</h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>
        Earn coins, subscribe to creators, and cash out your earnings
      </p>

      {/* Wallet summary */}
      {wallet && (
        <div className="fade-up-2" style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: 20, padding: 24, marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16
        }}>
          <div>
            <p style={{ color: '#ffffffaa', fontSize: 13, marginBottom: 4 }}>Your Balance</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: '#fff' }}>
              🪙 {wallet.balance.toLocaleString()}
            </p>
            <p style={{ color: '#ffffffaa', fontSize: 12, marginTop: 4 }}>
              Earned: {wallet.totalEarned} · Spent: {wallet.totalSpent}
            </p>
          </div>
          <button onClick={() => { setTab('buy coins') }} style={{
            background: '#ffffff22', border: '1px solid #ffffff44',
            color: '#fff', padding: '10px 20px', borderRadius: 12,
            fontSize: 14, fontWeight: 700, cursor: 'pointer'
          }}>
            + Buy Coins
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 4, overflowX: 'auto'
      }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
            background: tab === t ? 'var(--indigo)' : 'none',
            color: tab === t ? '#fff' : 'var(--text2)',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            textTransform: 'capitalize', whiteSpace: 'nowrap', transition: 'all 0.15s'
          }}>{t}</button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text2)' }}>Loading...</div>}

      {/* WALLET TAB */}
      {!loading && tab === 'wallet' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Transaction History
          </h3>
          {wallet?.transactions?.length === 0 && (
            <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 40 }}>No transactions yet</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wallet?.transactions?.slice().reverse().map((t, i) => (
              <div key={i} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{t.description}</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                    {new Date(t.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <p style={{
                  fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800,
                  color: t.type === 'credit' ? 'var(--green)' : '#ef4444'
                }}>
                  {t.type === 'credit' ? '+' : '-'}{t.amount} 🪙
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BUY COINS TAB */}
      {!loading && tab === 'buy coins' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Buy Coins
          </h3>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
            This is a simulated purchase for demo purposes.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {packages.map(pkg => (
              <div key={pkg.id} style={{
                background: 'var(--bg2)', border: `1px solid ${pkg.id === 'popular' ? 'var(--indigo)' : 'var(--border)'}`,
                borderRadius: 16, padding: 20, position: 'relative',
                transition: 'transform 0.15s'
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {pkg.id === 'popular' && (
                  <div style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--indigo)', color: '#fff', padding: '2px 12px',
                    borderRadius: 20, fontSize: 10, fontWeight: 800
                  }}>MOST POPULAR</div>
                )}
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                  {pkg.name}
                </p>
                <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--indigo)', marginBottom: 4 }}>
                  🪙 {pkg.coins.toLocaleString()}
                </p>
                {pkg.bonus > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--green)', marginBottom: 8 }}>
                    + {pkg.bonus} bonus coins!
                  </p>
                )}
                <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{pkg.price}</p>
                <button onClick={() => buyCoins(pkg)} disabled={buying === pkg.id} style={{
                  width: '100%', padding: '10px', background: 'var(--indigo)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  opacity: buying === pkg.id ? 0.7 : 1
                }}>
                  {buying === pkg.id ? 'Processing...' : `Buy for ${pkg.price}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS TAB */}
      {!loading && tab === 'subscriptions' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Creators You Subscribe To
          </h3>
          {subscriptions.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 60, color: 'var(--text2)',
              background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
            }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🔍</p>
              <p>You haven't subscribed to anyone yet</p>
              <button onClick={() => navigate('/search')} style={{
                marginTop: 16, padding: '10px 20px', background: 'var(--indigo)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>Find Creators</button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {subscriptions.map(sub => (
              <div key={sub._id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar src={sub.creator?.avatar} name={sub.creator?.username} size={44} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 15 }}>{sub.creator?.username}</p>
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                        background: TIER_COLORS[sub.tier] + '22', color: TIER_COLORS[sub.tier]
                      }}>
                        {TIER_ICONS[sub.tier]} {sub.tier.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                      Renews {new Date(sub.renewsAt).toLocaleDateString()} · {sub.price} coins/month
                    </p>
                  </div>
                </div>
                <button onClick={() => cancelSub(sub.creator._id)} style={{
                  padding: '7px 16px', background: 'none',
                  color: '#ef4444', border: '1px solid #ef444444',
                  borderRadius: 10, cursor: 'pointer', fontSize: 13
                }}>Cancel</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBSCRIBERS TAB */}
      {!loading && tab === 'subscribers' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Your Subscribers
          </h3>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
            {subscribers.length} active subscriber{subscribers.length !== 1 ? 's' : ''}
          </p>
          {subscribers.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 60, color: 'var(--text2)',
              background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
            }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
              <p>No subscribers yet — keep creating!</p>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {subscribers.map(sub => (
              <div key={sub._id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 16,
                display: 'flex', alignItems: 'center', gap: 12
              }}>
                <Avatar src={sub.subscriber?.avatar} name={sub.subscriber?.username} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{sub.subscriber?.username}</p>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20,
                      background: TIER_COLORS[sub.tier] + '22', color: TIER_COLORS[sub.tier]
                    }}>
                      {TIER_ICONS[sub.tier]} {sub.tier.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                    Since {new Date(sub.createdAt).toLocaleDateString()} · {sub.price} coins/month
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WITHDRAW TAB */}
      {!loading && tab === 'withdraw' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Cash Out Coins
          </h3>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 20 }}>
            Convert your coins to real money. Minimum 100 coins. Rate: 100 coins = $0.10
          </p>

          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24
          }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Amount (coins)
              </label>
              <input
                type="number" value={withdrawAmount}
                onChange={e => setWithdrawAmount(Number(e.target.value))}
                min={100} max={wallet?.balance || 0}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                }}
              />
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                ≈ ${(withdrawAmount * 0.001).toFixed(2)} USD · Available: {wallet?.balance || 0} coins
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Payment Method
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['UPI', 'PayPal', 'Bank Transfer'].map(m => (
                  <button key={m} onClick={() => setWithdrawMethod(m)} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                    background: withdrawMethod === m ? 'var(--indigo)' : 'var(--bg3)',
                    color: withdrawMethod === m ? '#fff' : 'var(--text2)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600
                  }}>{m}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
                Payment Details (UPI ID / PayPal email / Account number)
              </label>
              <input
                value={withdrawDetails} onChange={e => setWithdrawDetails(e.target.value)}
                placeholder={withdrawMethod === 'UPI' ? 'yourname@upi' : withdrawMethod === 'PayPal' ? 'email@example.com' : 'Account number'}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                }}
              />
            </div>

            <button onClick={requestWithdraw} disabled={withdrawing || withdrawAmount < 100 || !withdrawDetails.trim()} style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, var(--indigo), #8b5cf6)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              opacity: withdrawing || withdrawAmount < 100 ? 0.6 : 1
            }}>
              {withdrawing ? 'Processing...' : `Withdraw ${withdrawAmount} coins ≈ $${(withdrawAmount * 0.001).toFixed(2)}`}
            </button>

            {/* Previous withdrawal requests */}
            {wallet?.withdrawalRequests?.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Previous Requests</h4>
                {wallet.withdrawalRequests.slice().reverse().map((r, i) => (
                  <div key={i} style={{
                    background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px',
                    marginBottom: 8, display: 'flex', justifyContent: 'space-between'
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{r.amount} coins via {r.method}</p>
                      <p style={{ fontSize: 11, color: 'var(--text2)' }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, alignSelf: 'center',
                      background: r.status === 'approved' ? 'var(--green)22' : r.status === 'rejected' ? '#ef444422' : '#f59e0b22',
                      color: r.status === 'approved' ? 'var(--green)' : r.status === 'rejected' ? '#ef4444' : '#f59e0b'
                    }}>{r.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}