import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { Play, Pause, StopCircle, Send } from 'lucide-react'

let socket = null

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [title, setTitle] = useState('')
  const [timeLeft, setTimeLeft] = useState(60 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [phase, setPhase] = useState('work')
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const chatRef = useRef(null)
  const { token } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const totalTime = phase === 'work' ? 60 * 60 : 5 * 60
  const progress = ((totalTime - timeLeft) / totalTime) * 100

  useEffect(() => {
    fetchLiveSessions()
    socket = io('http://localhost:5000', { auth: { token } })
    socket.on('room:updated', (data) => { if (data.participants) setParticipants(data.participants) })
    socket.on('timer:tick', ({ remaining }) => setTimeLeft(remaining))
    socket.on('timer:done', () => { setIsRunning(false); setPhase(p => p === 'work' ? 'break' : 'work') })
    socket.on('chat:new', (msg) => {
      setMessages(prev => [...prev, msg])
      setTimeout(() => chatRef.current?.scrollTo(0, chatRef.current.scrollHeight), 50)
    })
    return () => socket.disconnect()
  }, [])

  async function fetchLiveSessions() {
    try {
      const res = await axios.get('http://localhost:5000/api/sessions/live')
      setSessions(res.data)
    } catch (err) { console.log(err) }
  }

  async function createSession(e) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      const res = await axios.post('http://localhost:5000/api/sessions', { title, duration: 50 }, { headers })
      setActiveSession(res.data)
      setTimeLeft(60 * 60)
      setTitle('')
      socket.emit('join:room', { sessionId: res.data._id })
      fetchLiveSessions()
    } catch (err) { console.log(err) }
  }

  function startTimer() { setIsRunning(true); socket.emit('timer:start', { sessionId: activeSession._id, duration: 60 }) }
  function pauseTimer() { setIsRunning(false); socket.emit('timer:pause', { sessionId: activeSession._id }) }

  async function endSession() {
    try {
      socket.emit('leave:room', { sessionId: activeSession._id })
      await axios.patch(`http://localhost:5000/api/sessions/${activeSession._id}/end`, {}, { headers })
      setActiveSession(null); setIsRunning(false); setTimeLeft(60 * 60)
      setParticipants([]); setMessages([])
      fetchLiveSessions()
    } catch (err) { console.log(err) }
  }

  function sendMessage(e) {
    e.preventDefault()
    if (!chatInput.trim()) return
    socket.emit('chat:message', { sessionId: activeSession._id, text: chatInput })
    setChatInput('')
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <h1 className="fade-up" style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 28 }}>
        Focus Sessions
      </h1>

      {activeSession ? (
        <div className="session-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
          {/* Timer Card */}
          <div className="fade-up" style={{
            background: 'linear-gradient(135deg, #0e0e1a, #13131f)',
            border: '1px solid var(--border)', borderRadius: 20, padding: 40,
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{
              fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
              color: phase === 'work' ? 'var(--indigo-light)' : 'var(--green)',
              marginBottom: 8
            }}>
              {phase === 'work' ? '⚡ Deep Work' : '☕ Break Time'}
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, marginBottom: 32, color: 'var(--text2)' }}>
              {activeSession.title}
            </h2>

            {/* Circular Timer */}
            <div style={{ position: 'relative', width: 160, height: 160, marginBottom: 32 }}>
              <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="80" cy="80" r="54" fill="none" stroke="var(--border2)" strokeWidth="8" />
                <circle cx="80" cy="80" r="54" fill="none"
                  stroke={phase === 'work' ? '#6366f1' : '#10b981'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexDirection: 'column'
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, color: 'var(--text)', letterSpacing: -1 }}>
                  {mins}:{secs}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
              <button onClick={isRunning ? pauseTimer : startTimer} style={{
                padding: '12px 32px',
                background: isRunning ? 'var(--border2)' : 'var(--indigo)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                animation: isRunning ? 'none' : 'pulse-ring 2s infinite'
              }}>
                {isRunning ? <><Pause size={18} /> Pause</> : <><Play size={18} fill="#fff" /> Start</>}
              </button>
              <button onClick={endSession} style={{
                padding: '12px 20px', background: 'none',
                color: 'var(--text2)', border: '1px solid var(--border2)',
                borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <StopCircle size={16} /> End
              </button>
            </div>

            {/* Participants */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {participants.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '4px 10px'
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{p.user?.username || 'User'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="fade-up-2" style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', height: 460
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>
              💬 Room Chat
            </h3>
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
              {messages.length === 0 && (
                <p style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
                  No messages yet...
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--indigo-light)' }}>{msg.user.username}</span>
                  <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 2, lineHeight: 1.5 }}>{msg.text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Send a message..."
                style={{
                  flex: 1, padding: '9px 12px', background: 'var(--bg3)',
                  border: '1px solid var(--border2)', borderRadius: 8,
                  color: 'var(--text)', fontSize: 13, outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
              <button type="submit" style={{
                padding: '9px 14px', background: 'var(--indigo)',
                color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer'
              }}>
                <Send size={15} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Start Session Form */}
          <div className="fade-up-2" style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 20, padding: 32, marginBottom: 32
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, marginBottom: 20 }}>
              Start a Focus Session
            </h2>
            <form onSubmit={createSession} style={{ display: 'flex', gap: 12 }}>
              <input
                placeholder="What are you working on today?"
                value={title} onChange={e => setTitle(e.target.value)}
                style={{
                  flex: 1, padding: '12px 16px', background: 'var(--bg3)',
                  border: '1px solid var(--border2)', borderRadius: 12,
                  color: 'var(--text)', fontSize: 15, outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--indigo)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
              <button type="submit" style={{
                padding: '12px 28px', background: 'var(--indigo)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
              }}> Start</button>
            </form>
          </div>

          {/* Live Sessions */}
          <h2 className="fade-up-3" style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16 }}>
            🔴 Live Sessions
          </h2>
          {sessions.length === 0 && (
            <div style={{
              textAlign: 'center', padding: 48, color: 'var(--text2)',
              background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
            }}>
              <p>No live sessions right now. Be the first! </p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {sessions.map((session, i) => (
              <div key={session._id} className="fade-up"
                onClick={async () => {
                  try {
                    await axios.post(`http://localhost:5000/api/sessions/${session._id}/join`, {}, { headers })
                    setActiveSession(session)
                    socket.emit('join:room', { sessionId: session._id })
                    setTimeLeft(60 * 60)
                  } catch (err) { console.log(err) }
                }}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: 20, animationDelay: `${i * 0.06}s`
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>{session.title}</h4>
                  <span style={{
                    background: '#ef444420', color: '#f87171',
                    padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700
                  }}>° LIVE</span>
                </div>
                <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>by {session.host?.username}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{session.participants?.length} participant(s)</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}