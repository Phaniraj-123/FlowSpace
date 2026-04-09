import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PolicyGate({ onAccept }) {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  const handleScroll = (e) => {
    const el = e.target
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) {
      setScrolled(true)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 0 0 1px #6366f120, 0 32px 64px #00000080',
        display: 'flex', flexDirection: 'column', maxHeight: '85vh'
      }}>
        {/* Header */}
        <div style={{ padding: '28px 28px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 8
          }}>
            <span style={{
              width: 32, height: 32, background: 'var(--indigo)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
            }}>⚡</span>
            FlowSpace
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Before you continue
          </h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 16 }}>
            Please read and accept our Privacy Policy to use FlowSpace.
          </p>
          {!scrolled && (
            <p style={{ color: '#f59e0b', fontSize: 13, marginBottom: 8 }}>
              ↓ Scroll to the bottom to accept
            </p>
          )}
        </div>

        {/* Scrollable policy content */}
        <div
          onScroll={handleScroll}
          style={{
            overflowY: 'auto', padding: '16px 28px',
            flex: 1, color: 'var(--text2)', fontSize: 14, lineHeight: 1.8
          }}
        >
          {[
            { title: 'Early Access Notice', content: 'FlowSpace is currently in early access. Features and policies may change as the platform evolves.' },
            { title: 'Operated By', content: 'FlowSpace is operated by Phaniraj B N, an individual based in India.' },
            { title: 'Data We Collect', content: 'We collect your name, email, phone number, payment info (via Razorpay), and stream activity data to provide our services.' },
            { title: 'No Refund Policy', content: 'All payments — coin purchases, subscriptions, and Pay-Per-View — are final and non-refundable. Once payment is made, it cannot be reversed under any circumstances.' },
            { title: 'Data Sharing', content: 'We do not sell your data. We share it only with Razorpay (payments), Cloudinary (media), and MongoDB Atlas (storage).' },
            { title: 'Your Rights', content: 'You may request access, correction, or deletion of your data by contacting us. Governed by the Information Technology Act, 2000 (India).' },
            { title: 'Age Requirement', content: 'FlowSpace is not intended for users under 13 years of age.' },
            { title: 'Policy Changes', content: 'This policy may be updated during early access. Continued use constitutes acceptance of any updates.' },
          ].map(({ title, content }) => (
            <div key={title} style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</p>
              <p>{content}</p>
            </div>
          ))}
          <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 8 }}>
            View full policy:{' '}
            <span
              onClick={() => navigate('/privacy-policy')}
              style={{ color: 'var(--indigo-light)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Privacy Policy
            </span>
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onAccept}
            disabled={!scrolled}
            style={{
              width: '100%', padding: '12px',
              background: scrolled ? 'var(--indigo)' : 'var(--border2)',
              color: scrolled ? '#fff' : 'var(--text2)',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600,
              cursor: scrolled ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            {scrolled ? 'I Accept & Continue →' : 'Scroll to accept'}
          </button>
        </div>
      </div>
    </div>
  )
}