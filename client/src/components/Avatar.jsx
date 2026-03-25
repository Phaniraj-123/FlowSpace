export default function Avatar({ src, name, size = 38, onClick, tier }) {
  const tierColors = { yellow: '#f59e0b', green: '#22c55e', purple: '#a855f7' }
  const tierEmojis = { yellow: '🟡', green: '🟢', purple: '🟣' }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      {src && src !== '' ? (
        <img src={src} alt={name} onClick={onClick} style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          border: tier ? `2px solid ${tierColors[tier]}` : '2px solid var(--border)'
        }} />
      ) : (
        <div onClick={onClick} style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--indigo), #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: size * 0.35,
          cursor: onClick ? 'pointer' : 'default',
          border: tier ? `2px solid ${tierColors[tier]}` : 'none'
        }}>{name?.[0]?.toUpperCase()}</div>
      )}
      {tier && (
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          fontSize: size * 0.3, lineHeight: 1
        }}>{tierEmojis[tier]}</div>
      )}
    </div>
  )
}
export function TierBadge({ tier, size = 18 }) {
  if (!tier) return null
  const colors = {
    yellow: '#f59e0b',
    green: '#22c55e',
    purple: '#a855f7'
  }
  const c = colors[tier]
  if (!c) return null

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Wavy star shape background */}
      <path
        d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z"
        fill={c}
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M8.5 12L11 14.5L15.5 9.5"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}