import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { Radio, Users, Heart } from 'lucide-react'

export default function LiveStreams() {
  const { token, user } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showStart, setShowStart] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [starting, setStarting] = useState(false)
  const [goLiveTab, setGoLiveTab] = useState('browser')
  const [streamKey, setStreamKey] = useState('')

  useEffect(() => {
    fetchStreams()
    fetchStreamKey()
    const interval = setInterval(fetchStreams, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchStreamKey() {
    try {
      const freshToken = useAuthStore.getState().token
      const res = await axios.get('http://localhost:5000/api/users/me/stream-key', {
        headers: { Authorization: `Bearer ${freshToken}` }
      })
      setStreamKey(res.data.streamKey)
    } catch (err) {
      console.log('stream key error:', err.response?.status, err.response?.data)
    }
  }

  async function regenerateKey() {
    if (!confirm('Regenerate stream key? Your old key will stop working.')) return
    try {
      const freshToken = useAuthStore.getState().token
      const res = await axios.post('http://localhost:5000/api/users/me/stream-key/regenerate', {}, {
        headers: { Authorization: `Bearer ${freshToken}` }
      })
      setStreamKey(res.data.streamKey)
    } catch (err) { console.log(err) }
  }

  async function fetchStreams() {
    try {
      const res = await axios.get('http://localhost:5000/api/livestream', { headers })
      setStreams(res.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function startStream() {
    if (!title.trim()) return
    setStarting(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      const res = await axios.post('http://localhost:5000/api/livestream/start',
        formData, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } })
      navigate(`/live/${res.data._id}?host=true`)
    } catch (err) { console.log(err) }
    finally { setStarting(false) }
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px 100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 className="fade-up" style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4
          }}>Live</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>
            {streams.length} stream{streams.length !== 1 ? 's' : ''} live now
          </p>
        </div>
        <button onClick={() => setShowStart(!showStart)} style={{
          padding: '10px 20px', background: showStart ? 'var(--bg3)' : 'var(--red)',
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {showStart ? '✕ Cancel' : <><Radio size={16} /> Go Live</>}
        </button>
      </div>

      {/* Start stream form */}
      {showStart && (
        <div className="fade-up" style={{
          background: 'var(--bg2)', border: '1px solid var(--red)44',
          borderRadius: 16, padding: 24, marginBottom: 28
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Start your stream
          </h3>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['browser', 'obs'].map(t => (
              <button key={t} onClick={() => setGoLiveTab(t)} style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: goLiveTab === t ? 'var(--indigo)' : 'var(--bg3)',
                color: goLiveTab === t ? '#fff' : 'var(--text2)',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700
              }}>
                {t === 'browser' ? '🌐 Browser' : '🎥 OBS / DSLR'}
              </button>
            ))}
          </div>

          {/* Browser tab */}
          {goLiveTab === 'browser' && (
            <>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Stream title (required)"
                style={{
                  width: '100%', padding: '12px 14px', marginBottom: 12,
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--red)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
              <input
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Description (optional)"
                style={{
                  width: '100%', padding: '12px 14px', marginBottom: 16,
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--red)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
              <button onClick={startStream} disabled={starting || !title.trim()} style={{
                padding: '12px 28px', background: 'var(--red)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                opacity: starting || !title.trim() ? 0.6 : 1
              }}>
                <Radio size={16} /> {starting ? 'Starting...' : 'Start Stream'}
              </button>
            </>
          )}

          {/* OBS tab */}
          {goLiveTab === 'obs' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
                Use OBS, DSLR, or any RTMP software to go live with professional quality.
              </p>

              <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>RTMP Server URL</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value="rtmp://localhost/live" style={{
                    flex: 1, padding: '8px 12px', background: 'var(--bg2)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    color: 'var(--text)', fontSize: 13, outline: 'none'
                  }} />
                  <button onClick={() => { navigator.clipboard.writeText('rtmp://localhost/live'); alert('✅ Copied!') }} style={{
                    padding: '8px 14px', background: 'var(--indigo)',
                    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12
                  }}>Copy</button>
                </div>
              </div>

              <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Stream Key</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={streamKey || 'Loading...'} type="password" style={{
                    flex: 1, padding: '8px 12px', background: 'var(--bg2)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    color: 'var(--text)', fontSize: 13, outline: 'none'
                  }} />
                  <button onClick={() => { navigator.clipboard.writeText(streamKey); alert('✅ Copied!') }} style={{
                    padding: '8px 14px', background: 'var(--indigo)',
                    color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12
                  }}>Copy</button>
                  <button onClick={regenerateKey} style={{
                    padding: '8px 14px', background: 'none',
                    color: 'var(--text2)', border: '1px solid var(--border)',
                    borderRadius: 8, cursor: 'pointer', fontSize: 12
                  }}>↻</button>
                </div>
              </div>

              <div style={{
                background: 'var(--indigo-dim)', border: '1px solid var(--indigo)33',
                borderRadius: 12, padding: 14
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>OBS Settings:</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
                  1. Open OBS → Settings → Stream<br />
                  2. Service: <strong style={{ color: 'var(--text)' }}>Custom</strong><br />
                  3. Server: <strong style={{ color: 'var(--text)' }}>rtmp://YOUR_SERVER_IP/live</strong><br />
                  4. Stream Key: <strong style={{ color: 'var(--text)' }}>paste your key above</strong><br />
                  5. Click Start Streaming!
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live streams grid */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>Loading...</div>
      )}

      {!loading && streams.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 80, color: 'var(--text2)',
          background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
        }}>
          <Radio size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: 'var(--text)' }}>
            No live streams right now
          </p>
          <p style={{ fontSize: 14 }}>Be the first to go live!</p>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 20
      }}>
        {streams.map((stream, i) => (
          <div key={stream._id} className="fade-up"
            onClick={() => navigate(`/live/${stream._id}`)}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
              animationDelay: `${i * 0.05}s`, transition: 'transform 0.15s, border-color 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.borderColor = 'var(--red)44'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            <div style={{
              height: 160, background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {stream.thumbnail ? (
                <img src={stream.thumbnail} alt={stream.title} style={{
                  width: '100%', height: '100%', objectFit: 'cover'
                }} />
              ) : (
                <Radio size={40} color="var(--red)" style={{ opacity: 0.5 }} />
              )}
              <div style={{
                position: 'absolute', top: 10, left: 10,
                background: 'var(--red)', color: '#fff',
                padding: '3px 10px', borderRadius: 20,
                fontSize: 11, fontWeight: 800, letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#fff', animation: 'pulse-ring 1.5s infinite'
                }} />
                LIVE
              </div>
              <div style={{
                position: 'absolute', top: 10, right: 10,
                background: '#00000088', color: '#fff',
                padding: '3px 10px', borderRadius: 20,
                fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                <Users size={11} /> {stream.viewerCount || 0}
              </div>
            </div>

            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                <Avatar src={stream.host?.avatar} name={stream.host?.username} size={32} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13 }}>{stream.host?.username}</p>
                  <p style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {new Date(stream.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{stream.title}</p>
              {stream.description && (
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{stream.description}</p>
              )}
              <div style={{ display: 'flex', gap: 12, color: 'var(--text2)', fontSize: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Heart size={12} /> {stream.likes?.length || 0}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={12} /> {stream.viewerCount || 0} watching
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}