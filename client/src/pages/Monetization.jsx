import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { Coins, TrendingUp, Users, Gift, ArrowDownCircle, Zap, Crown, Star } from 'lucide-react'
import API from "../api"


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
  const [earnings, setEarnings] = useState(null)


  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    try {
      const [walletRes, pkgRes, subsRes, subersRes, earningsRes] = await Promise.all([
        axios.get('https://flowspace-3ief.onrender.com/api/monetization/wallet', { headers }),
        axios.get('https://flowspace-3ief.onrender.com/api/monetization/packages', { headers }),
        axios.get('https://flowspace-3ief.onrender.com/api/monetization/my-subscriptions', { headers }),
        axios.get('https://flowspace-3ief.onrender.com/api/monetization/my-subscribers', { headers }),
        axios.get('https://flowspace-3ief.onrender.com/api/monetization/earnings', { headers })
      ])
      setWallet(walletRes.data)
      setPackages(pkgRes.data)
      setSubscriptions(subsRes.data)
      setSubscribers(subersRes.data)
      setEarnings(earningsRes.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function buyCoins(pkg) {
    setBuying(pkg.id)
    try {
      // 1. create order on server
      const res = await axios.post(
        'https://flowspace-3ief.onrender.com/api/monetization/create-order',
        { packageId: pkg.id }, { headers }
      )
      const { order, key } = res.data

      // 2. open Razorpay checkout
      const options = {
        key,
        amount: order.amount,
        currency: 'INR',
        name: 'Flowspace',
        description: `${pkg.name} - ${pkg.coins + pkg.bonus} coins`,
        order_id: order.id,
        handler: async function (response) {
          // 3. verify payment on server
          try {
            const verifyRes = await axios.post(
              'https://flowspace-3ief.onrender.com/api/monetization/verify-payment',
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                packageId: pkg.id
              },
              { headers }
            )
            setWallet(prev => ({ ...prev, balance: verifyRes.data.newBalance }))
            alert(`✅ Payment successful! ${verifyRes.data.coinsAdded} coins added!`)
          } catch (err) {
            alert('Payment verification failed. Contact support.')
          }
        },
        prefill: {
          name: user?.username,
          email: user?.email || ''
        },
        theme: { color: '#6366f1' },
        modal: {
          ondismiss: () => console.log('Payment cancelled')
        }
      }

      const razorpayInstance = new window.Razorpay(options)
      razorpayInstance.open()

    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initiate payment')
    } finally {
      setBuying(null)
    }
  }

  async function cancelSub(creatorId) {
    try {
      await axios.delete(`${API}/api/monetization/subscribe/${creatorId}`, { headers })
      setSubscriptions(prev => prev.filter(s => s.creator._id !== creatorId))
    } catch (err) { console.log(err) }
  }

  async function requestWithdraw() {
    if (!withdrawDetails.trim()) return alert('Please enter payment details')
    setWithdrawing(true)
    try {
      const res = await axios.post('https://flowspace-3ief.onrender.com/api/monetization/withdraw',
        { amount: withdrawAmount, method: withdrawMethod, details: withdrawDetails }, { headers })
      setWallet(prev => ({ ...prev, balance: res.data.newBalance }))
      setShowWithdraw(false)
      alert('✅ Withdrawal request submitted! We will process it within 3-5 business days.')
    } catch (err) {
      alert(err.response?.data?.error || 'Withdrawal failed')
    } finally { setWithdrawing(false) }
  }

  const tabs = ['wallet', 'buy coins', 'subscriptions', 'subscribers', 'earnings', 'withdraw']

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
                <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>{pkg.displayPrice}</p>
                <button onClick={() => buyCoins(pkg)} disabled={buying === pkg.id} style={{
                  width: '100%', padding: '10px', background: 'var(--indigo)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  opacity: buying === pkg.id ? 0.7 : 1
                }}>
                  {buying === pkg.id ? 'Processing...' : `Buy for ${pkg.displayPrice}`}
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

     
      {!loading && tab === 'earnings' && (
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
            Creator Earnings
          </h3>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
            {[
              { label: 'Total earned', value: wallet?.totalEarned || 0, color: 'var(--green)' },
              { label: 'From donations', value: earnings?.donations || 0, color: '#f59e0b' },
              { label: 'From subscriptions', value: earnings?.subscriptions || 0, color: '#a855f7' },
              { label: 'From PPV', value: earnings?.ppv || 0, color: '#3b82f6' },
              { label: 'Total spent', value: wallet?.totalSpent || 0, color: '#ef4444' },
              { label: 'Available', value: wallet?.balance || 0, color: 'var(--text)' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 14, padding: 16, textAlign: 'center'
              }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: stat.color }}>
                  🪙 {stat.value.toLocaleString()}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Subscriber breakdown */}
          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Subscriber breakdown</h4>
          <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            {['basic', 'pro', 'vip'].map(tier => {
              const count = subscribers.filter(s => s.tier === tier).length
              return (
                <div key={tier} style={{
                  flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 16, textAlign: 'center'
                }}>
                  <p style={{ fontSize: 28 }}>{TIER_ICONS[tier]}</p>
                  <p style={{ fontWeight: 800, fontSize: 24, color: TIER_COLORS[tier] }}>{count}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', textTransform: 'capitalize' }}>{tier}</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {count * { basic: 50, pro: 150, vip: 300 }[tier]} coins/mo
                  </p>
                </div>
              )
            })}
          </div>

          {/* Recent earnings */}
          <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Recent earnings</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {wallet?.transactions
              ?.filter(t => t.type === 'credit')
              .slice().reverse().slice(0, 15)
              .map((t, i) => (
                <div key={i} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <p style={{ fontSize: 13 }}>{t.description}</p>
                    <p style={{ fontSize: 11, color: 'var(--text2)' }}>
                      {new Date(t.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p style={{ fontWeight: 700, color: 'var(--green)', fontSize: 14 }}>
                    +{t.amount} 🪙
                  </p>
                </div>
              ))}
            {!wallet?.transactions?.filter(t => t.type === 'credit').length && (
              <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 40 }}>
                No earnings yet — start streaming!
              </p>
            )}
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
            Convert your coins to real money. Minimum 100 coins. Rate: 100 coins = ₹10
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
                ≈ ₹{(withdrawAmount * 0.099).toFixed(2)} INR · Available: {wallet?.balance || 0} coins
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
              {withdrawing ? 'Processing...' : `Withdraw ${withdrawAmount} coins ≈ ₹${(withdrawAmount * 0.099).toFixed(2)}`}
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