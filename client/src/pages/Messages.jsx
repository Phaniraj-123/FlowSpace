import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate, useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { Send, Search, ArrowLeft, MessageCircle, Image, Mic, Camera, Smile, Trash2, CornerUpLeft, X } from 'lucide-react'
import Avatar from '../components/Avatar'

let socket

const EMOJIS = ['😀', '😂', '😍', '🔥', '👏', '😢', '😮', '🎉', '❤️', '👍', '😎', '🙏', '💪', '😅', '🤔', '💯', '🚀', '✨', '😊', '🥳']

export default function Messages() {
  const { token, user: me } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()
  const { conversationId } = useParams()

  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [showEmojis, setShowEmojis] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [hoveredMsg, setHoveredMsg] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const messagesEndRef = useRef(null)
  const fileRef = useRef(null)
  const cameraRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordingInterval = useRef(null)
  const audioChunks = useRef([])

  useEffect(() => {
    fetchConversations()
    setupSocket()
    return () => {
      socket?.disconnect()
      if (recordingInterval.current) clearInterval(recordingInterval.current)
    }
  }, [])

  useEffect(() => {
    if (conversationId) openConversation(conversationId)
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function setupSocket() {
    socket = io('http://localhost:5000', { auth: { token } })
    socket.on('dm:message', (message) => {
      setMessages(prev => {
        if (prev.find(m => m._id === message._id)) return prev
        return [...prev, message]
      })
    })
    socket.on('dm:deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId))
    })
  }

  async function fetchConversations() {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/conversations', { headers })
      setConversations(res.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function openConversation(id) {
    try {
      if (activeConv) socket?.emit('dm:leave', activeConv._id)
      const res = await axios.get(
        `http://localhost:5000/api/messages/conversations/${id}/messages`, { headers }
      )
      const conv = conversations.find(c => c._id === id)
      setActiveConv(conv || { _id: id })
      setMessages(res.data)
      socket?.emit('dm:join', id)
      navigate(`/messages/${id}`, { replace: true })
      fetchConversations()
      window.dispatchEvent(new Event('dm:read'))
    } catch (err) { console.log(err) }
  }

  async function startConversation(userId) {
    try {
      const res = await axios.post('http://localhost:5000/api/messages/conversations',
        { userId }, { headers })
      setSearchQuery('')
      setSearchResults([])
      await fetchConversations()
      openConversation(res.data._id)
    } catch (err) { console.log(err) }
  }

  async function sendMessage(e) {
    e?.preventDefault()
    if ((!text.trim() && !mediaFile) || !activeConv) return
    setSending(true)
    try {
      if (mediaFile) {
        const formData = new FormData()
        formData.append('text', text)
        formData.append('media', mediaFile)
        if (replyTo) formData.append('replyTo', replyTo._id)
        await axios.post(
          `http://localhost:5000/api/messages/conversations/${activeConv._id}/messages`,
          formData,
          { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
        )
      } else {
        socket?.emit('dm:send', {
          conversationId: activeConv._id,
          text,
          replyTo: replyTo?._id || null
        })
      }
      setText('')
      setMediaFile(null)
      setMediaPreview(null)
      setReplyTo(null)
      setShowEmojis(false)
    } catch (err) { console.log(err) }
    finally { setSending(false) }
  }

  async function deleteMessage(msgId) {
  try {
    await axios.delete(`http://localhost:5000/api/messages/${msgId}`, { headers })
    socket?.emit('dm:delete', { conversationId: activeConv._id, messageId: msgId })
    setMessages(prev => prev.filter(m => m._id !== msgId))
    // refresh conversations to update sidebar
    fetchConversations()
  } catch (err) { console.log(err) }
}

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunks.current = []

      // use supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })

      mediaRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.current.push(e.data)
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks.current, { type: mimeType })
          const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
          const file = new File([audioBlob], `voice.${ext}`, { type: mimeType })

          const formData = new FormData()
          formData.append('media', file)
          formData.append('text', '🎤 Voice message')
          if (replyTo) formData.append('replyTo', replyTo?._id)

          await axios.post(
            `http://localhost:5000/api/messages/conversations/${activeConv._id}/messages`,
            formData,
            { headers: { ...headers, 'Content-Type': 'multipart/form-data' } }
          )
          stream.getTracks().forEach(t => t.stop())
        } catch (err) {
          console.log('voice send error:', err.message)
        }
      }

      mediaRecorderRef.current.start(100) // collect data every 100ms
      setRecording(true)
      setRecordingTime(0)
      recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch (err) {
      console.log('mic error:', err)
      alert('Microphone access denied!')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    clearInterval(recordingInterval.current)
    setRecordingTime(0)
  }

  async function searchUsers(e) {
    const val = e.target.value
    setSearchQuery(val)
    if (!val.trim()) return setSearchResults([])
    try {
      const res = await axios.get(`http://localhost:5000/api/users/search/${val}`, { headers })
      setSearchResults(res.data)
    } catch (err) { console.log(err) }
  }

  const getOtherUser = (conv) => conv.participants?.find(p => p.username !== me?.username)


  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const isMobile = window.innerWidth <= 768

  return (
    <div className="messages-page" style={{
      maxWidth: 900, margin: '0 auto',
      padding: isMobile ? '0' : '24px',
      height: isMobile ? 'calc(100vh - 58px - 60px)' : 'calc(100vh - 80px)',
      display: 'flex', gap: isMobile ? 0 : 20,
      overflow: 'hidden'
    }}>

      {/* Sidebar */}
      <div style={{
        width: isMobile ? '100%' : 300,
        flexShrink: 0,
        display: isMobile && activeConv ? 'none' : 'flex',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: isMobile ? 0 : 16,
        flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, marginBottom: 12 }}>
            Messages
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text2)'
            }} />
            <input value={searchQuery} onChange={searchUsers} placeholder="New message..."
              style={{
                width: '100%', padding: '8px 10px 8px 30px',
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
              onBlur={e => e.target.style.borderColor = 'var(--border2)'}
            />
          </div>
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', zIndex: 100,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 10, marginTop: 4, width: 268,
              boxShadow: '0 8px 32px #00000044'
            }}>
              {searchResults.map(u => (
                <div key={u._id} onClick={() => startConversation(u._id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', cursor: 'pointer'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Avatar src={user?.avatar} name={user?.username} size={38} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 20, fontSize: 13 }}>Loading...</p>}
          {!loading && conversations.length === 0 && (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text2)' }}>
              <MessageCircle size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <p style={{ fontSize: 13 }}>No messages yet</p>
            </div>
          )}
          {conversations.map(conv => {
            const other = getOtherUser(conv)
            const isActive = activeConv?._id === conv._id
            const hasUnread = conv.unreadCount > 0 && !isActive
            return (
              <div key={conv._id} onClick={() => openConversation(conv._id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', cursor: 'pointer',
                background: isActive ? 'var(--indigo-dim)' : 'none',
                borderLeft: isActive ? '2px solid var(--indigo)' : '2px solid transparent',
                transition: 'background 0.15s'
              }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg3)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none' }}
              >
                <div style={{ position: 'relative' }}>
                  <Avatar src={other?.avatar} name={other?.username} size={38} />
                  {hasUnread && (
                    <div style={{
                      position: 'absolute', top: 0, right: 0,
                      width: 10, height: 10, borderRadius: '50%',
                      background: 'var(--indigo)', border: '2px solid var(--bg2)'
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <p style={{ fontWeight: hasUnread ? 700 : 600, fontSize: 13, marginBottom: 2 }}>
                      {other?.username}
                    </p>
                    {conv.lastMessageAt && (
                      <span style={{ fontSize: 10, color: 'var(--text2)' }}>
                        {new Date(conv.lastMessageAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 12, color: hasUnread ? 'var(--text)' : 'var(--text2)',
                    fontWeight: hasUnread ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>{conv.lastMessageText || 'Start a conversation'}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {!activeConv ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', color: 'var(--text2)'
          }}>
            <MessageCircle size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, color: 'var(--text)' }}>Your Messages</p>
            <p style={{ fontSize: 14 }}>Select a conversation or search for someone</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <button onClick={() => setActiveConv(null)} style={{
                background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer'
              }}>
                <ArrowLeft size={18} />
              </button>
              <Avatar src={getOtherUser(activeConv)?.avatar} name={getOtherUser(activeConv)?.username} size={38} />

              <div>
                <p style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                  onClick={() => navigate(`/user/${getOtherUser(activeConv)?.username}`)}>
                  {getOtherUser(activeConv)?.username}
                </p>
                <p style={{ fontSize: 12, color: 'var(--green)' }}>● online</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 4
            }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>
                  <p style={{ fontSize: 13 }}>No messages yet. Say hi! 👋</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.sender?.username === me?.username
                const showAvatar = !isMe && (i === 0 || messages[i - 1]?.sender?.username !== msg.sender?.username)
                const isHovered = hoveredMsg === msg._id
                const repliedMsg = msg.replyTo ? messages.find(m => m._id === msg.replyTo) : null

                return (
                  <div key={msg._id || i}
                    onMouseEnter={() => setHoveredMsg(msg._id)}
                    onMouseLeave={(e) => {
                      // checking for moving actions
                      if (!e.relatedTarget?.closest?.('[data-actions]')) {
                        setHoveredMsg(null)
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'flex-end', gap: 8,
                      justifyContent: isMe ? 'flex-end' : 'flex-start',
                      marginBottom: 6, position: 'relative'
                    }}>

                    {!isMe && (
                      <div style={{ width: 28, flexShrink: 0 }}>
                        {showAvatar && <Avatar src={msg.sender?.avatar} name={msg.sender?.username} size={28} />
}
                      </div>
                    )}

                    <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Reply preview */}
                      {repliedMsg && (
                        <div style={{
                          background: 'var(--bg3)', borderLeft: '3px solid var(--indigo)',
                          borderRadius: '8px 8px 0 0', padding: '6px 10px',
                          fontSize: 12, color: 'var(--text2)'
                        }}>
                          <span style={{ color: 'var(--indigo-light)', fontWeight: 600 }}>
                            {repliedMsg.sender?.username}
                          </span>
                          <p style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {repliedMsg.text || '📷 Media'}
                          </p>
                        </div>
                      )}

                      <div style={{
                        padding: msg.image ? '6px' : '10px 14px',
                        borderRadius: repliedMsg
                          ? isMe ? '0 0 4px 16px' : '0 0 16px 4px'
                          : isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isMe ? 'var(--indigo)' : 'var(--bg3)',
                        color: isMe ? '#fff' : 'var(--text)',
                        fontSize: 14, lineHeight: 1.5,
                        border: isMe ? 'none' : '1px solid var(--border)'
                      }}>
                        {msg.image && (
                          msg.image.includes('.webm') || msg.image.includes('video') ? (
                            <audio controls src={msg.image} style={{ maxWidth: '100%' }} />
                          ) : msg.image.includes('mp4') ? (
                            <video src={msg.image} controls style={{ maxWidth: '100%', borderRadius: 10, maxHeight: 300 }} />
                          ) : (
                            <img src={msg.image} alt="media" style={{
                              maxWidth: '100%', borderRadius: 10, maxHeight: 300, objectFit: 'cover', display: 'block'
                            }} />
                          )
                        )}
                        {msg.text && msg.text !== '🎤 Voice message' && (
                          <p style={{ padding: msg.image ? '6px 8px 2px' : 0 }}>{msg.text}</p>
                        )}
                        <p style={{
                          fontSize: 10, marginTop: 4,
                          padding: msg.image ? '0 8px 4px' : 0,
                          textAlign: 'right',
                          color: isMe ? '#ffffff88' : 'var(--text2)'
                        }}>
                          {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons on hover */}
                    {isHovered && (
                      <div
                        data-actions="true"
                        onMouseEnter={() => setHoveredMsg(msg._id)}
                        onMouseLeave={() => setHoveredMsg(null)}
                        style={{
                          display: 'flex', gap: 4,
                          position: 'absolute',
                          right: isMe ? 'auto' : 0,
                          left: isMe ? 0 : 'auto',
                          bottom: '100%', marginBottom: 4
                        }}>
                        <button onClick={() => setReplyTo(msg)} style={{
                          background: 'var(--bg3)', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                          color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11
                        }}>
                          <CornerUpLeft size={12} /> Reply
                        </button>
                        {isMe && (
                          <button onClick={() => deleteMessage(msg._id)} style={{
                            background: 'var(--bg3)', border: '1px solid var(--border)',
                            borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                            color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11
                          }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                      </div>
                    )
                    }
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply banner */}
            {replyTo && (
              <div style={{
                padding: '8px 20px', borderTop: '1px solid var(--border)',
                background: 'var(--bg3)', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CornerUpLeft size={14} color="var(--indigo-light)" />
                  <div>
                    <p style={{ fontSize: 11, color: 'var(--indigo-light)', fontWeight: 600 }}>
                      Replying to {replyTo.sender?.username}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                      {replyTo.text || '📷 Media'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setReplyTo(null)} style={{
                  background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer'
                }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Emoji picker */}
            {showEmojis && (
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--border)',
                background: 'var(--bg3)', display: 'flex', flexWrap: 'wrap', gap: 8
              }}>
                {EMOJIS.map(emoji => (
                  <button key={emoji} onClick={() => setText(t => t + emoji)} style={{
                    background: 'none', border: 'none', fontSize: 22,
                    cursor: 'pointer', padding: 2, borderRadius: 6,
                    transition: 'transform 0.1s'
                  }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >{emoji}</button>
                ))}
              </div>
            )}

            {/* Input area */}
            <div style={{ padding: '14px 20px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              {mediaPreview && (
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  {mediaFile?.type.startsWith('video') ? (
                    <video src={mediaPreview} controls style={{ maxHeight: 200, borderRadius: 10, maxWidth: '100%' }} />
                  ) : (
                    <img src={mediaPreview} alt="preview" style={{ maxHeight: 200, borderRadius: 10, maxWidth: '100%', objectFit: 'cover' }} />
                  )}
                  <button onClick={() => { setMediaFile(null); setMediaPreview(null) }} style={{
                    position: 'absolute', top: 6, right: 6,
                    background: '#00000088', border: 'none', color: '#fff',
                    borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>✕</button>
                </div>
              )}

              {recording ? (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', background: 'var(--bg3)',
                  borderRadius: 10, border: '1px solid var(--red)44'
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)', animation: 'pulse-ring 1s infinite' }} />
                  <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: 14 }}>
                    Recording {formatTime(recordingTime)}
                  </span>
                  <button onClick={stopRecording} style={{
                    marginLeft: 'auto', padding: '6px 16px', background: 'var(--red)',
                    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 600, fontSize: 13
                  }}>Send</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Hidden file inputs */}
                  <input ref={fileRef} type="file" accept="image/*,video/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0]
                      if (file) { setMediaFile(file); setMediaPreview(URL.createObjectURL(file)) }
                    }}
                  />
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files[0]
                      if (file) { setMediaFile(file); setMediaPreview(URL.createObjectURL(file)) }
                    }}
                  />

                  {/* Camera */}
                  <button onClick={() => cameraRef.current.click()} title="Camera" style={{
                    background: 'none', border: '1px solid var(--border2)',
                    color: 'var(--text2)', borderRadius: 10, padding: '10px 11px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0
                  }}>
                    <Camera size={16} />
                  </button>

                  {/* Gallery */}
                  <button onClick={() => fileRef.current.click()} title="Photo/Video" style={{
                    background: 'none', border: '1px solid var(--border2)',
                    color: 'var(--text2)', borderRadius: 10, padding: '10px 11px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0
                  }}>
                    <Image size={16} />
                  </button>

                  {/* Emoji */}
                  <button onClick={() => setShowEmojis(!showEmojis)} title="Emoji" style={{
                    background: showEmojis ? 'var(--indigo-dim)' : 'none',
                    border: '1px solid var(--border2)',
                    color: showEmojis ? 'var(--indigo-light)' : 'var(--text2)',
                    borderRadius: 10, padding: '10px 11px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0
                  }}>
                    <Smile size={16} />
                  </button>

                  {/* Text input */}
                  <input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a message..."
                    style={{
                      flex: 1, padding: '10px 14px',
                      background: 'var(--bg3)', border: '1px solid var(--border2)',
                      borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                  />

                  {/* Voice or Send */}
                  {text.trim() || mediaFile ? (
                    <button onClick={sendMessage} disabled={sending} style={{
                      padding: '10px 16px', background: 'var(--indigo)',
                      color: '#fff', border: 'none', borderRadius: 10,
                      cursor: sending ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontWeight: 600, opacity: sending ? 0.7 : 1, flexShrink: 0
                    }}>
                      <Send size={16} />
                    </button>
                  ) : (
                    <button onClick={startRecording} title="Voice message" style={{
                      padding: '10px 14px', background: 'var(--bg3)',
                      color: 'var(--text2)', border: '1px solid var(--border2)',
                      borderRadius: 10, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', flexShrink: 0
                    }}>
                      <Mic size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div >
  )
}