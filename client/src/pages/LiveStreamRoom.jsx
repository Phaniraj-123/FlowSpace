import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import Avatar from '../components/Avatar'
import SimplePeer from 'simple-peer'
import { Heart, Send, Users, X, Mic, MicOff } from 'lucide-react'
import { useLiveStream } from '../context/LiveStreamContext'

export default function LiveStreamRoom() {
    const { id } = useParams()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { token, user } = useAuthStore()
    const headers = { Authorization: `Bearer ${token}` }
    const { getSocket, localStreamRef: contextStreamRef, startStream, joinStream, endStream, leaveStream, isHosting, activeStreamId } = useLiveStream()

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
    const localStreamRef = contextStreamRef || useRef(null)


    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const messagesEndRef = useRef(null)
    const peerRef = useRef(null)

    useEffect(() => {
        fetchStream()
        fetchWallet()
    }, [id])

    useEffect(() => {
        if (!stream) return
        setupSocketListeners()
        if (isHost) {
            startStream(id).then(() => {
                if (localVideoRef.current && localStreamRef.current) {
                    localVideoRef.current.srcObject = localStreamRef.current
                }
            })
        } else {
            joinStream(id)
        }
    }, [stream])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // show local video when localStreamRef is set
    useEffect(() => {
        if (isHost && localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current
        }
    }, [isHost, localStreamRef.current])

    async function fetchStream() {
        try {
            const res = await axios.get(`http://localhost:5000/api/livestream/${id}`, { headers })
            setStream(res.data)
            setMessages(res.data.messages || [])
            setViewerCount(res.data.viewerCount || 0)
            setLikes(res.data.likes?.length || 0)
            setIsLiked(res.data.likes?.includes(user?._id))
            const hostId = res.data.host?._id || res.data.host
            if (hostId === user?._id || hostId === user?.id) {
                setIsHost(true)
            }
        } catch (err) {
            console.log(err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchWallet() {
        try {
            const res = await axios.get('http://localhost:5000/api/livestream/wallet/me', { headers })
            setWallet(res.data)
        } catch (err) { console.log(err) }
    }

    function setupSocketListeners() {
        const socket = getSocket()

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

        socket.on('stream:viewer_left', ({ viewerCount: vc }) => {
            setViewerCount(Math.max(0, vc))
        })

        socket.on('stream:message', (message) => {
            setMessages(prev => [...prev, message])
        })

        socket.on('stream:likes', ({ count, isLiked: liked, userId }) => {
            setLikes(count)
            if (userId === user?._id || userId === user?.id) setIsLiked(liked)
        })

        socket.on('stream:donation_received', (donation) => {
            setDonations(prev => [...prev, donation])
            addSystemMessage(`💰 ${donation.username} donated ${donation.amount} coins!`)
            setTimeout(() => setDonations(prev => prev.slice(1)), 5000)
        })

        socket.on('webrtc:offer', ({ offer }) => {
            if (!isHost) {
                const peer = new SimplePeer({ initiator: false, trickle: false })
                peerRef.current = peer
                peer.signal(offer)
                peer.on('signal', answer => {
                    socket.emit('webrtc:answer', { streamId: id, answer })
                })
                peer.on('stream', remoteStream => {
                    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
                })
            }
        })

        socket.on('webrtc:answer', ({ answer }) => {
            if (peerRef.current) peerRef.current.signal(answer)
        })

        socket.on('stream:host_ready', () => {
            if (!isHost) requestStream()
        })

        socket.on('stream:ended', ({ message }) => {
            if (!isHost) {
                alert(message)
                navigate('/live')
            }
        })
    }

    function requestStream() {
        const socket = getSocket()
        const peer = new SimplePeer({ initiator: true, trickle: false })
        peerRef.current = peer
        peer.on('signal', offer => {
            socket.emit('webrtc:offer', { streamId: id, offer, viewerId: user?._id })
        })
        peer.on('stream', remoteStream => {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
        })
    }

    function sendOfferToViewer() {
        const socket = getSocket()
        const peer = new SimplePeer({
            initiator: true, trickle: false,
            stream: localStreamRef.current
        })
        peerRef.current = peer
        peer.on('signal', offer => {
            socket.emit('webrtc:offer', { streamId: id, offer, viewerId: 'new' })
        })
    }

    function toggleMic() {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
            setMicOn(prev => !prev)
        }
    }

    function addSystemMessage(msg) {
        setMessages(prev => [...prev, {
            username: 'System', text: msg, type: 'join',
            createdAt: new Date(), _id: Date.now()
        }])
    }

    async function handleEndStream() {
        try {
            await axios.post(`http://localhost:5000/api/livestream/${id}/end`, {}, { headers })
            endStream(id)
            navigate('/live')
        } catch (err) { console.log(err) }
    }

    function sendMessage() {
        if (!text.trim()) return
        const socket = getSocket()
        socket.emit('stream:chat', { streamId: id, text })
        setMessages(prev => [...prev, {
            username: user?.username,
            avatar: user?.avatar,
            text,
            type: 'message',
            createdAt: new Date(),
            _id: Date.now()
        }])
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
            socket.emit('stream:donation', {
                streamId: id,
                donation: { amount: donateAmount, message: donateMsg, username: user?.username }
            })
            setShowDonate(false)
            setDonateMsg('')
            addSystemMessage(`💰 You donated ${donateAmount} coins!`)
        } catch (err) {
            alert(err.response?.data?.error || 'Donation failed')
        }
    }

    if (loading) return (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading stream...</div>
    )

    if (!stream) return (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Stream not found</div>
    )

    return (
        <div style={{
            maxWidth: 1400, margin: '0 auto', padding: '20px 24px',
            display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16,
            height: 'calc(100vh - 80px)', overflow: 'hidden'
        }}>
            {/* Video + controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Video */}
                <div style={{
                    position: 'relative', borderRadius: 16, overflow: 'hidden',
                    background: '#000', aspectRatio: '16/9',
                    maxHeight: 'calc(100vh - 220px)'
                }}>
                    {isHost ? (
                        <video ref={localVideoRef} autoPlay muted playsInline style={{
                            width: '100%', height: '100%', objectFit: 'cover'
                        }} />
                    ) : (
                        <video ref={remoteVideoRef} autoPlay playsInline style={{
                            width: '100%', height: '100%', objectFit: 'cover'
                        }} />
                    )}

                    {streamError && (
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: '#00000088', color: '#fff', fontSize: 14, padding: 20
                        }}>{streamError}</div>
                    )}

                    <div style={{
                        position: 'absolute', top: 14, left: 14,
                        background: 'var(--red)', color: '#fff',
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                        display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <div style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: '#fff', animation: 'pulse-ring 1.5s infinite'
                        }} />
                        LIVE
                    </div>

                    <div style={{
                        position: 'absolute', top: 14, right: 14,
                        background: '#00000099', color: '#fff',
                        padding: '4px 12px', borderRadius: 20, fontSize: 12,
                        display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        <Users size={13} /> {viewerCount}
                    </div>

                    {donations.map((d, i) => (
                        <div key={i} style={{
                            position: 'absolute', bottom: 70, left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                            color: '#fff', padding: '10px 20px', borderRadius: 30,
                            fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
                            animation: 'fadeUp 0.3s ease'
                        }}>
                            💰 {d.username} donated {d.amount} coins!
                        </div>
                    ))}

                    <div style={{
                        position: 'absolute', bottom: 14, right: 14,
                        display: 'flex', flexDirection: 'column', gap: 6,
                        maxWidth: 280, pointerEvents: 'none'
                    }}>
                        {messages.slice(-5).filter(m => m.type === 'message').map((msg, i) => (
                            <div key={i} style={{
                                background: '#00000099', backdropFilter: 'blur(8px)',
                                padding: '6px 12px', borderRadius: 20,
                                fontSize: 13, color: '#fff', animation: 'fadeUp 0.3s ease'
                            }}>
                                <span style={{
                                    fontWeight: 700, marginRight: 6,
                                    color: msg.username === stream.host?.username ? '#f43f5e' : '#a5b4fc'
                                }}>{msg.username}</span>
                                {msg.text}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Controls */}
                <div style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '14px 18px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar src={stream.host?.avatar} name={stream.host?.username} size={40} />
                        <div>
                            <p style={{ fontWeight: 700, fontSize: 15 }}>{stream.title}</p>
                            <p style={{ fontSize: 13, color: 'var(--text2)' }}>by {stream.host?.username}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <button onClick={toggleLike} style={{
                            background: isLiked ? '#f43f5e22' : 'var(--bg3)',
                            border: `1px solid ${isLiked ? '#f43f5e' : 'var(--border)'}`,
                            color: isLiked ? '#f43f5e' : 'var(--text2)',
                            padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
                            fontSize: 13, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            <Heart size={15} fill={isLiked ? '#f43f5e' : 'none'} /> {likes}
                        </button>

                        {!isHost && (
                            <button onClick={() => setShowDonate(!showDonate)} style={{
                                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                                color: '#fff', border: 'none', padding: '8px 16px',
                                borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                                display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                💰 Donate ({wallet?.balance || 0} coins)
                            </button>
                        )}

                        {isHost && (
                            <>
                                <button onClick={toggleMic} style={{
                                    background: micOn ? 'var(--bg3)' : 'var(--red)',
                                    color: micOn ? 'var(--text)' : '#fff',
                                    border: `1px solid ${micOn ? 'var(--border)' : 'var(--red)'}`,
                                    padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
                                    fontSize: 13, fontWeight: 600,
                                    display: 'flex', alignItems: 'center', gap: 6
                                }}>
                                    {micOn ? <Mic size={15} /> : <MicOff size={15} />}
                                    {micOn ? 'Mic On' : 'Mic Off'}
                                </button>
                                <button onClick={handleEndStream} style={{
                                    background: 'var(--red)', color: '#fff', border: 'none',
                                    padding: '8px 20px', borderRadius: 20, cursor: 'pointer',
                                    fontSize: 13, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', gap: 6
                                }}>
                                    <X size={14} /> End Stream
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {showDonate && (
                    <div style={{
                        background: 'var(--bg2)', border: '1px solid #f59e0b44',
                        borderRadius: 14, padding: 20
                    }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                            💰 Send Coins to {stream.host?.username}
                        </h3>
                        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
                            Your balance: <strong style={{ color: '#f59e0b' }}>{wallet?.balance || 0} coins</strong>
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                            {[10, 25, 50, 100, 250, 500].map(amt => (
                                <button key={amt} onClick={() => setDonateAmount(amt)} style={{
                                    padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
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
                                width: '100%', padding: '10px 14px', marginBottom: 12,
                                background: 'var(--bg3)', border: '1px solid var(--border2)',
                                borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setShowDonate(false)} style={{
                                flex: 1, padding: '10px', background: 'none',
                                color: 'var(--text2)', border: '1px solid var(--border2)',
                                borderRadius: 10, cursor: 'pointer', fontSize: 13
                            }}>Cancel</button>
                            <button onClick={sendDonation} style={{
                                flex: 2, padding: '10px',
                                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                                color: '#fff', border: 'none', borderRadius: 10,
                                cursor: 'pointer', fontSize: 13, fontWeight: 700
                            }}>Send {donateAmount} 🪙</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Chat */}
            <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, display: 'flex', flexDirection: 'column',
                overflow: 'hidden', height: '100%'
            }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>Live Chat</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            {msg.type !== 'join' && <Avatar src={msg.avatar} name={msg.username} size={24} />}
                            <div style={{ flex: 1 }}>
                                {msg.type === 'join' ? (
                                    <p style={{ fontSize: 11, color: 'var(--text2)', fontStyle: 'italic', textAlign: 'center' }}>{msg.text}</p>
                                ) : (
                                    <>
                                        <span style={{
                                            fontSize: 12, fontWeight: 700, marginRight: 6,
                                            color: msg.username === stream.host?.username ? 'var(--red)' : 'var(--indigo-light)'
                                        }}>
                                            {msg.username === stream.host?.username ? '🎙️ ' : ''}{msg.username}
                                        </span>
                                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{msg.text}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                <div style={{
                    padding: '12px 14px', borderTop: '1px solid var(--border)',
                    display: 'flex', gap: 8
                }}>
                    <input
                        value={text} onChange={e => setText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Say something..."
                        style={{
                            flex: 1, padding: '8px 12px',
                            background: 'var(--bg3)', border: '1px solid var(--border2)',
                            borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none'
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--red)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                    />
                    <button onClick={sendMessage} style={{
                        padding: '8px 12px', background: 'var(--red)',
                        color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
                    }}>
                        <Send size={15} />
                    </button>
                </div>
            </div>
        </div>
    )
}