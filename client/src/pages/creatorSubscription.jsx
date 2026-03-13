import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const TIER_INFO = {
  yellow: { color: '#f59e0b', emoji: '🟡', name: 'Yellow', price: '₹15/month', priceINR: 500, split: '50/50', perks: ['Subscriber badge', 'Support creator', 'Basic perks'] },
  green: { color: '#22c55e', emoji: '🟢', name: 'Green', price: '₹25/month', priceINR: 1500, split: '60/40', perks: ['Green badge', 'Exclusive content', 'Priority chat'] },
  purple: { color: '#a855f7', emoji: '🟣', name: 'Purple', price: '₹55/month', priceINR: 2500, split: '70/30', perks: ['Purple badge', 'All perks', 'Direct access', 'VIP support'] }
}

export default function CreatorSubscription() {
  const { token, user, updateUser } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [currentTier, setCurrentTier] = useState(user?.subscriptionTier)
  const [upgrading, setUpgrading] = useState(null)

  useEffect(() => {
    autoCheck()
  }, [])

  async function autoCheck() {
    try {
      const res = await axios.post('http://localhost:5000/api/plans/check-tick', {}, { headers })
      if (res.data.awarded) {
        setCurrentTier(res.data.tier)
        updateUser({ subscriptionTier: res.data.tier })
      } else {
        // not eligible yet
        setCurrentTier(null)
      }
    } catch (err) { console.log(err) }
    finally { setChecking(false) }
  }

  async function upgradeTier(tier) {
    setUpgrading(tier)
    try {
      await axios.post('http://localhost:5000/api/plans/upgrade-tier', { tier }, { headers })
      setCurrentTier(tier)
      updateUser({ subscriptionTier: tier })
    } catch (err) { alert(err.response?.data?.error || 'Upgrade failed') }
    finally { setUpgrading(null) }
  }

  if (checking) return (
    <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>
      Checking eligibility...
    </div>
  )

  if (!currentTier) return (
    <div style={{ maxWidth: 500, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 48, marginBottom: 16 }}>🔒</p>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
        Not Eligible Yet
      </h2>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
        You need at least 10 followers and 7 live streams to unlock creator subscriptions.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={() => navigate('/live')} style={{
          padding: '10px 20px', background: 'var(--red)', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer'
        }}>Go Live</button>
        <button onClick={() => navigate('/feed')} style={{
          padding: '10px 20px', background: 'var(--bg2)', color: 'var(--text)',
          border: '1px solid var(--border)', borderRadius: 10, fontSize: 14, cursor: 'pointer'
        }}>Grow Followers</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 100px' }}>
      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 8
      }}>Creator Subscriptions</h1>
      <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 28 }}>
        You're eligible! Choose your subscription tier.
      </p>

      {/* Current tier banner */}
      <div style={{
        background: `linear-gradient(135deg, ${TIER_INFO[currentTier].color}22, ${TIER_INFO[currentTier].color}11)`,
        border: `1px solid ${TIER_INFO[currentTier].color}44`,
        borderRadius: 20, padding: 20, marginBottom: 28,
        display: 'flex', alignItems: 'center', gap: 14
      }}>
        <span style={{ fontSize: 36 }}>{TIER_INFO[currentTier].emoji}</span>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: TIER_INFO[currentTier].color }}>
            {TIER_INFO[currentTier].name} Creator
          </p>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>
            You earn {TIER_INFO[currentTier].split.split('/')[0]}% · Subscribers pay {TIER_INFO[currentTier].price}
          </p>
        </div>
      </div>

      {/* All tiers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.entries(TIER_INFO).map(([tier, info]) => (
          <div key={tier} style={{
            background: 'var(--bg2)',
            border: `2px solid ${currentTier === tier ? info.color : 'var(--border)'}`,
            borderRadius: 16, padding: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 28 }}>{info.emoji}</span>
                <div>
                  <p style={{ fontWeight: 800, fontSize: 16, color: info.color }}>{info.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {info.price} · {info.split} revenue split
                  </p>
                </div>
              </div>
              {currentTier === tier ? (
                <span style={{
                  padding: '6px 14px', background: info.color + '22',
                  color: info.color, borderRadius: 10, fontSize: 12, fontWeight: 700
                }}>✓ Active</span>
              ) : (
                <button onClick={() => upgradeTier(tier)} disabled={upgrading === tier} style={{
                  padding: '8px 18px', background: info.color,
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  opacity: upgrading === tier ? 0.7 : 1
                }}>
                  {upgrading === tier ? 'Saving...' :
                    Object.keys(TIER_INFO).indexOf(tier) > Object.keys(TIER_INFO).indexOf(currentTier)
                      ? 'Upgrade' : 'Downgrade'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {info.perks.map(p => (
                <span key={p} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: info.color + '22', color: info.color, fontWeight: 600
                }}>✓ {p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Razorpay subscription note */}
      <div style={{
        marginTop: 24, background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 16
      }}>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          💡 <strong style={{ color: 'var(--text)' }}>How it works:</strong> When fans subscribe to you via your profile,
          they pay via Razorpay. You receive your split directly to your wallet.
          Minimum payout is ₹100.
        </p>
      </div>
    </div>
  )
}