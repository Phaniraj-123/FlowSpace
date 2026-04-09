import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/Avatar'
import SimplePeer from 'simple-peer'
import { Heart, Send, Users, X, Mic, MicOff, ChevronDown, MessageCircle, Minimize2, Volume2, VolumeX } from 'lucide-react'
import { useLiveStream } from '../context/LiveStreamContext'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function LiveStreamRoom() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const { getSocket, localStreamRef: contextStreamRef, startStream, joinStream, endStream, loadHLSStream, receiveOffer, activeStreamId } = useLiveStream()
  const isMobile = useIsMobile()

  const [stream, setStream] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [likes, setLikes] = useState(0)
  const [isLiked, setIsLiked] = useState(false)
  const [showDonate, setShowDonate] = useState(false)
  const [donateAmount, setDonateAmount] = useState(10)
  const [donateMsg, setDonateMsg] = useState('')
  const [wallet, setWallet] = useState(null)
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [streamError, setStreamError] = useState('')
  const [micOn, setMicOn] = useState(true)
  const [isHost, setIsHost] = useState(searchParams.get('host') === 'true')
  const [showChat, setShowChat] = useState(false)
  const [showPiP, setShowPiP] = useState(false)
  const [pipMuted, setPipMuted] = useState(false)
  const localStreamRef = contextStreamRef || useRef(null)
  const hasStartedStream = useRef(false)
  const [hasPPVAccess, setHasPPVAccess] = useState(false)
  const [purchasingPPV, setPurchasingPPV] = useState(false)

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const messagesEndRef = useRef(null)
  const peerRef = useRef(null)

  useEffect(() => { fetchStream(); fetchWallet() }, [id])

  // Show PiP when user switches tab or navigates away mid-stream
  useEffect(() => {
    if (isHost || !stream || loading) return

    // Tab switch
    function handleVisibility() {
      if (document.hidden) setShowPiP(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Browser back/forward navigation
    function handlePopState() {
      setShowPiP(true)
    }
    window.addEventListener('popstate', handlePopState)

    // Intercept React router navigation — push a history entry so popstate fires
    window.history.pushState(null, '', window.location.href)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [stream, loading, isHost])

  useEffect(() => {
    if (!stream) return
    if (!stream.isPPV || isHost) { setHasPPVAccess(true); return }
    if (stream.ppvBuyers?.includes(user?._id)) { setHasPPVAccess(true); return }
  }, [stream, isHost])

  useEffect(() => {
    if (!stream) return
    setupSocketListeners()
    const socket = getSocket()
    if (isHost && !hasStartedStream.current) {
      hasStartedStream.current = true
      socket.emit('stream:join', { streamId: id })
      startStream(id).then((mediaStream) => {
        if (localVideoRef.current && mediaStream) localVideoRef.current.srcObject = mediaStream
      }).catch(() => setStreamError('Camera access denied.'))
    } else if (!isHost) {
      socket.emit('stream:join', { streamId: id })
      joinStream(id, stream?.streamKey)
    }
  }, [stream])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (isHost && localVideoRef.current && localStreamRef.current)
      localVideoRef.current.srcObject = localStreamRef.current
  }, [isHost, localStreamRef.current])

  useEffect(() => {
    if (!isHost && stream?.streamKey && remoteVideoRef.current) {
      const hls = loadHLSStream(remoteVideoRef.current, stream.streamKey)
      return () => hls?.destroy()
    }
  }, [stream, isHost])

  async function fetchStream() {
    try {
      const res = await axios.get(`http://localhost:5000/api/livestream/${id}`, { headers })
      setStream(res.data)
      setMessages(res.data.messages || [])
      setViewerCount(res.data.viewerCount || 0)
      setLikes(res.data.likes?.length || 0)
      setIsLiked(res.data.likes?.includes(user?._id))
      const hostId = res.data.host?._id || res.data.host
      if (hostId === user?._id || hostId === user?.id) setIsHost(true)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function fetchWallet() {
    try {
      const res = await axios.get('http://localhost:5000/api/livestream/wallet/me', { headers })
      setWallet(res.data)
    } catch (err) { console.log(err) }
  }

  function setupSocketListeners() {
    const socket = getSocket()
    socket.emit('stream:join', { streamId: id })
    socket.off('stream:viewer_joined')
    socket.off('stream:viewer_left')
    socket.off('stream:message')
    socket.off('stream:likes')
    socket.off('stream:donation_received')
    socket.off('webrtc:offer')
    socket.off('webrtc:answer')
    socket.off('stream:host_ready')
    socket.off('stream:ended')

    socket.on('stream:viewer_joined', ({ username, viewerCount: vc }) => {
      setViewerCount(vc)
      addSystemMessage(`${username} joined`)
      if (isHost && localStreamRef.current) sendOfferToViewer()
    })
    socket.on('stream:viewer_left', ({ viewerCount: vc }) => setViewerCount(Math.max(0, vc)))
    socket.on('stream:message', (message) => setMessages(prev => [...prev, message]))
    socket.on('stream:likes', ({ count, isLiked: liked, userId }) => {
      setLikes(count)
      if (userId === user?._id || userId === user?.id) setIsLiked(liked)
    })
    socket.on('stream:donation_received', (donation) => {
      setDonations(prev => [...prev, donation])
      addSystemMessage(`💰 ${donation.username} donated ${donation.amount} coins!`)
      setTimeout(() => setDonations(prev => prev.slice(1)), 5000)
    })
    socket.on('webrtc:offer', ({ offer, viewerId }) => {
      if (!isHost) receiveOffer(offer, id, viewerId, (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
      })
    })
    socket.on('webrtc:answer', ({ answer }) => { if (peerRef.current) peerRef.current.signal(answer) })
    socket.on('stream:host_ready', () => { if (!isHost) requestStream() })
    socket.on('stream:ended', ({ message }) => { if (!isHost) { alert(message); navigate('/live') } })
  }

  function requestStream() {
    const socket = getSocket()
    const peer = new SimplePeer({ initiator: true, trickle: false })
    peerRef.current = peer
    peer.on('signal', offer => socket.emit('webrtc:offer', { streamId: id, offer, viewerId: user?._id }))
    peer.on('stream', remoteStream => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream })
  }

  function sendOfferToViewer() {
    const socket = getSocket()
    const peer = new SimplePeer({ initiator: true, trickle: false, stream: localStreamRef.current })
    peerRef.current = peer
    peer.on('signal', offer => socket.emit('webrtc:offer', { streamId: id, offer, viewerId: socket.id }))
  }

  function toggleMic() {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
      setMicOn(prev => !prev)
    }
  }

  function addSystemMessage(msg) {
    setMessages(prev => [...prev, { username: 'System', text: msg, type: 'join', createdAt: new Date(), _id: Date.now() }])
  }

  async function handleEndStream() {
    try {
      hasStartedStream.current = false
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
      if (localVideoRef.current) localVideoRef.current.srcObject = null
      endStream(id)
      await axios.post(`http://localhost:5000/api/livestream/${id}/end`, {}, { headers })
      navigate('/live')
    } catch (err) { console.log(err); navigate('/live') }
  }

  function sendMessage() {
    if (!text.trim()) return
    const socket = getSocket()
    socket.emit('stream:chat', { streamId: id, text })
    setText('')
  }

  function toggleLike() {
    const socket = getSocket()
    socket.emit('stream:like', { streamId: id })
  }

  async function sendDonation() {
    if (!donateAmount) return
    try {
      const res = await axios.post(`http://localhost:5000/api/livestream/${id}/donate`,
        { amount: donateAmount, message: donateMsg }, { headers })
      setWallet(prev => ({ ...prev, balance: res.data.newBalance }))
      const socket = getSocket()
      socket.emit('stream:donation', { streamId: id, donation: { amount: donateAmount, message: donateMsg, username: user?.username } })
      setShowDonate(false)
      setDonateMsg('')
      addSystemMessage(`💰 You donated ${donateAmount} coins!`)
    } catch (err) { alert(err.response?.data?.error || 'Donation failed') }
  }

  async function purchasePPV() {
    setPurchasingPPV(true)
    try {
      await axios.post(`http://localhost:5000/api/livestream/${id}/purchase-ppv`, {}, { headers })
      setHasPPVAccess(true)
    } catch (err) { alert(err.response?.data?.error || 'Purchase failed') }
    finally { setPurchasingPPV(false) }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading stream...</div>
  if (!stream) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Stream not found</div>

  const chatColors = ['#6366f1', '#a855f7', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6', '#e11d48']
  function getMsgColor(username) {
    let hash = 0
    for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
    return chatColors[Math.abs(hash) % chatColors.length]
  }

  const ChatContent = (
    <>
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>Live Chat</h3>
        {isMobile && (
          <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer' }}>
            <ChevronDown size={20} />
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {msg.type !== 'join' && <Avatar src={msg.avatar} name={msg.username} size={22} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              {msg.type === 'join' ? (
                <p style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', textAlign: 'center' }}>{msg.text}</p>
              ) : (
                <>
                  <span style={{
                    fontSize: 12, fontWeight: 700, marginRight: 5,
                    color: msg.username === stream.host?.username ? 'var(--red)' : getMsgColor(msg.username)
                  }}>
                    {msg.username === stream.host?.username ? '🎙️ ' : ''}{msg.username}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text)', wordBreak: 'break-word' }}>{msg.text}</span>
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Say something..."
          style={{
            flex: 1, padding: '8px 11px',
            background: 'var(--bg3)', border: '2px solid var(--border2)',
            borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--red)'}
          onBlur={e => e.target.style.borderColor = 'var(--border2)'}
        />
        <button onClick={sendMessage} style={{
          padding: '8px 12px', background: 'var(--red)',
          color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', flexShrink: 0
        }}>
          <Send size={14} />
        </button>
      </div>
    </>
  )

  return (
    <>
      <style>{`
        .stream-root {
          max-width: 1600px;
          margin: 0 auto;
          padding: 14px 14px 20px;
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 14px;
          height: calc(100vh - 80px);
          overflow: auto;
        }
        @media (max-width: 768px) {
          .stream-root {
            grid-template-columns: 1fr;
            height: auto;
            padding: 8px 8px 90px;
            gap: 10px;
          }
        }
        .stream-desktop-chat { display: flex; flex-direction: column; overflow: hidden; }
        @media (max-width: 768px) { .stream-desktop-chat { display: none !important; } }
        .stream-controls {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .ctrl-btns { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .ctrl-btn {
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          border: none;
        }
        @media (max-width: 480px) {
          .ctrl-btn { padding: 7px 10px; font-size: 12px; }
          .stream-controls { padding: 10px 12px; }
        }
        .mobile-chat-fab {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-chat-fab {
            display: flex;
            align-items: center;
            gap: 6px;
          }
        }
        .mobile-chat-drawer {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 500;
          background: var(--bg2);
          border-top: 1px solid var(--border);
          border-radius: 20px 20px 0 0;
          display: flex;
          flex-direction: column;
          height: 60vh;
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      <div className="stream-root">
        {/* Left col: video + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>

          {/* Video */}
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '16/9' }}>
            {stream?.isPPV && !hasPPVAccess && !isHost && (
              <div style={{
                position: 'absolute', inset: 0, background: '#000000dd',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 14,
                padding: 20, textAlign: 'center'
              }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🔒</p>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Pay-Per-View</p>
                <p style={{ color: '#ffffff88', fontSize: 13, marginBottom: 16 }}>Unlock for {stream.ppvPrice} coins</p>
                <button onClick={purchasePPV} disabled={purchasingPPV} style={{
                  padding: '10px 24px', background: 'var(--indigo)', color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  opacity: purchasingPPV ? 0.7 : 1
                }}>
                  {purchasingPPV ? 'Processing...' : `Unlock ${stream.ppvPrice} 🪙`}
                </button>
              </div>
            )}

            {isHost ? (
              <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : stream?.streamKey ? (
              <video ref={remoteVideoRef} autoPlay playsInline controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}

            {streamError && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#00000088', color: '#fff', fontSize: 14, padding: 20, textAlign: 'center'
              }}>{streamError}</div>
            )}

            {/* LIVE badge */}
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'var(--red)', color: '#fff',
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse-ring 1.5s infinite' }} />
              LIVE
            </div>

            {/* Viewer count */}
            <div style={{
              position: 'absolute', top: 10, right: 10,
              background: '#00000099', color: '#fff',
              padding: '3px 10px', borderRadius: 20, fontSize: 11,
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              <Users size={11} /> {viewerCount}
            </div>

            {/* Donation popups */}
            {donations.map((d, i) => (
              <div key={i} style={{
                position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                color: '#fff', padding: '8px 18px', borderRadius: 24,
                fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', animation: 'fadeUp 0.3s ease'
              }}>
                💰 {d.username} donated {d.amount} coins!
              </div>
            ))}

            {/* Floating chat preview on mobile */}
            <div style={{
              position: 'absolute', bottom: 10, right: 10,
              display: 'flex', flexDirection: 'column', gap: 5,
              maxWidth: '70%', pointerEvents: 'none'
            }}>
              {messages.slice(-3).filter(m => m.type === 'message').map((msg, i) => (
                <div key={i} style={{
                  background: '#00000099', backdropFilter: 'blur(8px)',
                  padding: '5px 10px', borderRadius: 18,
                  fontSize: 12, color: '#fff', animation: 'fadeUp 0.3s ease'
                }}>
                  <span style={{ fontWeight: 700, marginRight: 5, color: msg.username === stream.host?.username ? '#f43f5e' : '#a5b4fc' }}>
                    {msg.username}
                  </span>
                  {msg.text}
                </div>
              ))}
            </div>
          </div>

          {/* Controls bar */}
          <div className="stream-controls">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <Avatar src={stream.host?.avatar} name={stream.host?.username} size={36} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stream.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>by {stream.host?.username}</p>
              </div>
            </div>

            <div className="ctrl-btns">
              {/* Like */}
              <button className="ctrl-btn" onClick={toggleLike} style={{
                background: isLiked ? '#f43f5e22' : 'var(--bg3)',
                border: `1px solid ${isLiked ? '#f43f5e' : 'var(--border)'}`,
                color: isLiked ? '#f43f5e' : 'var(--text2)'
              }}>
                <Heart size={14} fill={isLiked ? '#f43f5e' : 'none'} /> {likes}
              </button>

              {/* Chat FAB — mobile only */}
              <button className="mobile-chat-fab ctrl-btn" onClick={() => setShowChat(true)} style={{
                background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)'
              }}>
                <MessageCircle size={14} /> Chat
              </button>

              {!isHost && (
                <button className="ctrl-btn" onClick={() => setShowDonate(!showDonate)} style={{
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff'
                }}>
                  💰 {wallet?.balance || 0}
                </button>
              )}

              {isHost && (
                <>
                  <button className="ctrl-btn" onClick={toggleMic} style={{
                    background: micOn ? 'var(--bg3)' : 'var(--red)',
                    color: micOn ? 'var(--text)' : '#fff',
                    border: `1px solid ${micOn ? 'var(--border)' : 'var(--red)'}`
                  }}>
                    {micOn ? <Mic size={14} /> : <MicOff size={14} />}
                    {micOn ? 'On' : 'Off'}
                  </button>
                  <button className="ctrl-btn" onClick={handleEndStream} style={{
                    background: 'var(--red)', color: '#fff'
                  }}>
                    <X size={13} /> End
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Donate panel */}
          {showDonate && (
            <div style={{
              background: 'var(--bg2)', border: '1px solid #f59e0b44',
              borderRadius: 12, padding: 16
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                💰 Send Coins to {stream.host?.username}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
                Balance: <strong style={{ color: '#f59e0b' }}>{wallet?.balance || 0} coins</strong>
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {[10, 25, 50, 100, 250, 500].map(amt => (
                  <button key={amt} onClick={() => setDonateAmount(amt)} style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: donateAmount === amt ? '#f59e0b' : 'var(--bg3)',
                    color: donateAmount === amt ? '#fff' : 'var(--text2)'
                  }}>{amt} 🪙</button>
                ))}
              </div>
              <input
                value={donateMsg} onChange={e => setDonateMsg(e.target.value)}
                placeholder="Add a message... (optional)"
                style={{
                  width: '100%', padding: '9px 12px', marginBottom: 12,
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowDonate(false)} style={{
                  flex: 1, padding: '10px', background: 'none', color: 'var(--text2)',
                  border: '1px solid var(--border2)', borderRadius: 8, cursor: 'pointer', fontSize: 13
                }}>Cancel</button>
                <button onClick={sendDonation} style={{
                  flex: 2, padding: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700
                }}>Send {donateAmount} 🪙</button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop chat (right col) */}
        <div className="stream-desktop-chat" style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14
        }}>
          {ChatContent}
        </div>
      </div>

      {/* Mobile chat drawer */}
      {isMobile && showChat && (
        <>
          <div style={{
            position: 'fixed', inset: 0, background: '#00000055', zIndex: 499
          }} onClick={() => setShowChat(false)} />
          <div className="mobile-chat-drawer">
            {ChatContent}
          </div>
        </>
      )}

      {/* PiP Window — shows when viewer switches tab */}
      {showPiP && !isHost && (
        <div style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 9999,
          width: 260, borderRadius: 16, overflow: 'hidden',
          background: '#000', boxShadow: '0 8px 40px #000a',
          border: '1px solid var(--border)', animation: 'fadeUp 0.2s ease'
        }}>
          {/* PiP video mirror */}
          <div style={{ position: 'relative', aspectRatio: '16/9', background: '#111' }}>
            <video
              ref={el => {
                if (el && remoteVideoRef.current?.srcObject)
                  el.srcObject = remoteVideoRef.current.srcObject
              }}
              autoPlay playsInline muted={pipMuted}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute', top: 6, left: 8,
              background: 'var(--red)', color: '#fff',
              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pulse-ring 1.5s infinite' }} />
              LIVE
            </div>
          </div>

          {/* PiP controls */}
          <div style={{
            background: 'var(--bg2)', padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stream?.title}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text2)' }}>{stream?.host?.username}</p>
            </div>

            {/* Mute toggle */}
            <button onClick={() => setPipMuted(m => !m)} title={pipMuted ? 'Unmute' : 'Mute'} style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
              color: 'var(--text2)', display: 'flex', alignItems: 'center'
            }}>
              {pipMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>

            {/* Return to stream */}
            <button onClick={() => setShowPiP(false)} style={{
              background: 'var(--indigo)', border: 'none',
              borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              <Minimize2 size={12} /> Return
            </button>

            {/* Close + leave */}
            <button onClick={() => { setShowPiP(false); navigate('/live') }} title="Leave stream" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text2)', display: 'flex', alignItems: 'center', padding: '4px'
            }}>
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}