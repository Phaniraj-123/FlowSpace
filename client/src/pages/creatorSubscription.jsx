import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const TIER_INFO = {
  yellow: { color: '#f59e0b', emoji: '🟡', name: 'Yellow', price: '₹399/month', priceINR: 39900, split: '50/50', perks: ['Subscriber badge', 'Support creator', 'Basic perks'] },
  green: { color: '#22c55e', emoji: '🟢', name: 'Green', price: '₹999/month', priceINR: 99900, split: '60/40', perks: ['Green badge', 'Exclusive content', 'Priority chat'] },
  purple: { color: '#a855f7', emoji: '🟣', name: 'Purple', price: '₹1999/month', priceINR: 199900, split: '70/30', perks: ['Purple badge', 'All perks', 'Direct access', 'VIP support'] }
}

export default function CreatorSubscription() {
  const { token, user, updateUser } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()

  const [currentTier, setCurrentTier] = useState(user?.subscriptionTier || null)
  const [upgrading, setUpgrading] = useState(null)
  const [confirmTier, setConfirmTier] = useState(null)
  const [autoAwarded, setAutoAwarded] = useState(false)

  useEffect(() => {
    checkAutoAward()
  }, [])

  // Only used to auto-award yellow if eligible — does NOT block anything
  async function checkAutoAward() {
    try {
      const res = await axios.post('http://localhost:5000/api/plans/check-tick', {}, { headers })
      if (res.data.awarded && !currentTier) {
        setCurrentTier(res.data.tier)
        updateUser({ subscriptionTier: res.data.tier })
        if (!res.data.alreadyHad) setAutoAwarded(true)
      }
    } catch (err) { console.log(err) }
  }

  async function upgradeTier(tier) {
    setUpgrading(tier)
    try {
      const freshToken = useAuthStore.getState().token

      const orderRes = await axios.post('http://localhost:5000/api/plans/activate-tier',
        { tier },
        { headers: { Authorization: `Bearer ${freshToken}` } }
      )

      const { orderId, amount, currency, keyId } = orderRes.data

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'FlowSpace',
        description: `${TIER_INFO[tier].name} Creator Tier Activation`,
        order_id: orderId,
        handler: async function (response) {
          const freshToken2 = useAuthStore.getState().token
          const verifyRes = await axios.post('http://localhost:5000/api/plans/activate-tier/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            tier
          }, { headers: { Authorization: `Bearer ${freshToken2}` } })

          setCurrentTier(tier)
          updateUser({ subscriptionTier: tier })
          alert(`🎉 ${verifyRes.data.message}`)
        },
        prefill: { name: user?.name || user?.username, email: user?.email },
        theme: { color: TIER_INFO[tier].color }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      console.log('error:', err.response?.status, err.response?.data)
      alert(err.response?.data?.error || 'Payment failed')
    } finally { setUpgrading(null) }
  }

  return (
    <>
      <style>{`
        .creator-sub-root {
          max-width: 700px;
          margin: 0 auto;
          padding: 28px 20px 100px;
        }
        .tier-card {
          background: var(--bg2);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 14px;
          transition: border-color 0.15s;
        }
        .tier-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .confirm-modal {
          position: fixed; inset: 0;
          background: #00000088;
          z-index: 999;
          display: flex; align-items: flex-end; justify-content: center;
          padding: 0;
        }
        .confirm-sheet {
          background: var(--bg);
          border-radius: 24px 24px 0 0;
          padding: 28px 24px 36px;
          width: 100%; max-width: 480px;
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <div className="creator-sub-root">
        <h1 className="fade-up" style={{
          fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 6
        }}>Creator Subscriptions</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
          Activate a tier so fans can subscribe to you directly from your profile.
        </p>

        {/* Auto-awarded banner */}
        {autoAwarded && (
          <div style={{
            background: '#f59e0b22', border: '1px solid #f59e0b44',
            borderRadius: 14, padding: '14px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <span style={{ fontSize: 24 }}>🎉</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>Yellow tier auto-awarded!</p>
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>You met the eligibility criteria. Fans can now subscribe to you.</p>
            </div>
          </div>
        )}

        {/* Current tier banner */}
        {currentTier && (
          <div style={{
            background: `linear-gradient(135deg, ${TIER_INFO[currentTier].color}22, ${TIER_INFO[currentTier].color}11)`,
            border: `1px solid ${TIER_INFO[currentTier].color}44`,
            borderRadius: 16, padding: '16px 20px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 14
          }}>
            <span style={{ fontSize: 32 }}>{TIER_INFO[currentTier].emoji}</span>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: TIER_INFO[currentTier].color }}>
                {TIER_INFO[currentTier].name} Creator — Active
              </p>
              <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                You earn {TIER_INFO[currentTier].split.split('/')[0]}% · Fans pay {TIER_INFO[currentTier].price}
              </p>
            </div>
          </div>
        )}

        {/* No tier yet — friendly message, NOT a blocker */}
        {!currentTier && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '16px 20px', marginBottom: 24
          }}>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
              💡 Choose a tier below to activate creator subscriptions. Once active, fans can subscribe to you from your profile and you'll start earning.
            </p>
          </div>
        )}

        {/* Tier cards */}
        {Object.entries(TIER_INFO).map(([tier, info]) => (
          <div key={tier} className="tier-card" style={{
            border: `2px solid ${currentTier === tier ? info.color : 'var(--border)'}`
          }}>
            <div className="tier-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                  color: info.color, borderRadius: 10, fontSize: 12, fontWeight: 700,
                  flexShrink: 0
                }}>✓ Active</span>
              ) : (
                <button
                  onClick={() => setConfirmTier(tier)}
                  disabled={upgrading === tier}
                  style={{
                    padding: '8px 18px', background: info.color,
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    opacity: upgrading === tier ? 0.7 : 1, flexShrink: 0
                  }}
                >
                  {upgrading === tier ? 'Processing...' :
                    !currentTier ? 'Activate' :
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

        {/* Info box */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 16, marginTop: 8
        }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
            💡 <strong style={{ color: 'var(--text)' }}>How it works:</strong> Activate a tier once (one-time fee).
            Then when fans subscribe to you on your profile, they pay monthly and you receive your revenue split directly to your wallet.
            Minimum payout is ₹100.
          </p>
        </div>
      </div>

      {/* Confirm bottom sheet */}
      {confirmTier && (
        <div className="confirm-modal" onClick={() => setConfirmTier(null)}>
          <div className="confirm-sheet" onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 20px' }} />

            <span style={{ fontSize: 40 }}>{TIER_INFO[confirmTier].emoji}</span>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
              color: TIER_INFO[confirmTier].color, marginTop: 10, marginBottom: 6
            }}>
              {TIER_INFO[confirmTier].name} Creator Plan
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
              Pay once to activate this tier. Fans can then subscribe to you monthly.
            </p>

            <div style={{ background: 'var(--bg2)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>One-time activation fee</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{TIER_INFO[confirmTier].price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Your revenue share</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: TIER_INFO[confirmTier].color }}>
                  {TIER_INFO[confirmTier].split.split('/')[0]}%
                </span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {TIER_INFO[confirmTier].perks.map(p => (
                  <p key={p} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>✓ {p}</p>
                ))}
              </div>
            </div>

            <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 16, textAlign: 'center' }}>
              Payments secured by Razorpay · No refunds per our policy
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmTier(null)} style={{
                flex: 1, padding: '12px', background: 'none',
                color: 'var(--text2)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer', fontSize: 14
              }}>Cancel</button>
              <button onClick={() => { setConfirmTier(null); upgradeTier(confirmTier) }} style={{
                flex: 2, padding: '12px',
                background: TIER_INFO[confirmTier].color,
                color: '#fff', border: 'none', borderRadius: 10,
                cursor: 'pointer', fontSize: 14, fontWeight: 700
              }}>
                Activate {TIER_INFO[confirmTier].name} Tier
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}