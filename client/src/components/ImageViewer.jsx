export default function ImageViewer({ src, onClose }) {
  if (!src) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: '#000000ee',
      zIndex: 9999, display: 'flex', alignItems: 'center',
      justifyContent: 'center', cursor: 'zoom-out'
    }}>
      <img src={src} alt="fullscreen" style={{
        maxWidth: '95vw', maxHeight: '95vh',
        objectFit: 'contain', borderRadius: 12,
        boxShadow: '0 20px 60px #000'
      }} onClick={e => e.stopPropagation()} />
      <button onClick={onClose} style={{
        position: 'absolute', top: 20, right: 20,
        background: '#ffffff22', border: 'none', color: '#fff',
        borderRadius: '50%', width: 40, height: 40,
        fontSize: 20, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}>✕</button>
    </div>
  )
}