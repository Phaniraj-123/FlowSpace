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
export function TierBadge({ tier, size = 14 }) {
  if (!tier) return null
  const tierEmojis = { yellow: '🟡', green: '🟢', purple: '🟣' }
  return (
    <span style={{ fontSize: size, lineHeight: 1, flexShrink: 0 }}>
      {tierEmojis[tier]}
    </span>
  )
}