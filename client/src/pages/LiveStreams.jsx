import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { Radio, Users, Heart, Search, X } from 'lucide-react'
import { useLiveStream } from '../context/LiveStreamContext'
import API from "../api"


const CATEGORIES = ['All', 'Gaming', 'Music', 'Study', 'Art', 'Tech', 'Just Chatting', 'Sports', 'Food']
const SORTS = [
  { label: 'Most viewers', value: 'viewers' },
  { label: 'Newest', value: 'newest' },
]

export default function LiveStreams() {
  const { token, user } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()
  const { isHosting, activeStreamId } = useLiveStream()

  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showStart, setShowStart] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [starting, setStarting] = useState(false)
  const [goLiveTab, setGoLiveTab] = useState('browser')
  const [streamKey, setStreamKey] = useState('')
  const [category, setCategory] = useState('Just Chatting')
  const [isPPV, setIsPPV] = useState(false)
  const [ppvPrice, setPpvPrice] = useState(50)

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sort, setSort] = useState('viewers')
  const searchTimeout = useRef(null)

  useEffect(() => {
    fetchStreamKey()
    const interval = setInterval(() => fetchStreams(search, activeCategory, sort), 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchStreams(search, activeCategory, sort)
    }, 400)
  }, [search, activeCategory, sort])

  async function fetchStreams(q = '', cat = 'All', s = 'viewers') {
    try {
      const params = new URLSearchParams()
      if (q) params.append('search', q)
      if (cat && cat !== 'All') params.append('category', cat)
      if (s) params.append('sort', s)
      const res = await axios.get(`${API}/api/livestream?${params}`, { headers })
      setStreams(res.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function fetchStreamKey() {
    try {
      const freshToken = useAuthStore.getState().token
      const res = await axios.get('${API}/api/users/me/stream-key', {
        headers: { Authorization: `Bearer ${freshToken}` }
      })
      setStreamKey(res.data.streamKey)
    } catch (err) { console.log(err) }
  }

  async function regenerateKey() {
    if (!confirm('Regenerate stream key? Your old key will stop working.')) return
    try {
      const freshToken = useAuthStore.getState().token
      const res = await axios.post('${API}/api/users/me/stream-key/regenerate', {}, {
        headers: { Authorization: `Bearer ${freshToken}` }
      })
      setStreamKey(res.data.streamKey)
    } catch (err) { console.log(err) }
  }

  async function startStream() {
    if (!title.trim()) return
    setStarting(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('category', category)
      formData.append('isPPV', isPPV)
      formData.append('ppvPrice', ppvPrice)
      const res = await axios.post('${API}/api/livestream/start',
        formData, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } })
      navigate(`/live/${res.data._id}?host=true`)
    } catch (err) { console.log(err) }
    finally { setStarting(false) }
  }

  return (
    <>
      <style>{`
        .live-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        @media (max-width: 480px) {
          .live-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
        }
        @media (max-width: 360px) {
          .live-grid { grid-template-columns: 1fr; }
        }
        .cat-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .cat-scroll::-webkit-scrollbar { display: none; }
        .cat-pill {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .go-live-btn {
          padding: 10px 20px;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @media (max-width: 480px) {
          .live-header { flex-direction: column; align-items: flex-start; gap: 12px; }
          .go-live-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px 100px' }}>

        {/* Header */}
        <div className="live-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 className="fade-up" style={{
              fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 4
            }}>Live</h1>
            <p style={{ color: 'var(--text2)', fontSize: 14 }}>
              {streams.length} stream{streams.length !== 1 ? 's' : ''} live now
            </p>
          </div>
          <button className="go-live-btn" onClick={() => setShowStart(!showStart)} style={{
            background: showStart ? 'var(--bg3)' : 'var(--red)',
          }}>
            {showStart ? <><X size={16} /> Cancel</> : <><Radio size={16} /> Go Live</>}
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text2)'
          }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search streams or streamers..."
            style={{
              width: '100%', padding: '10px 12px 10px 36px',
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = 'var(--red)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position: 'absolute', right: 12, top: '50%',
              transform: 'translateY(-50%)', background: 'none',
              border: 'none', cursor: 'pointer', color: 'var(--text2)'
            }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category filters - horizontally scrollable on mobile */}
        <div className="cat-scroll" style={{ marginBottom: 10 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} className="cat-pill" onClick={() => setActiveCategory(cat)} style={{
              background: activeCategory === cat ? 'var(--red)' : 'var(--bg2)',
              color: activeCategory === cat ? '#fff' : 'var(--text2)',
              border: `1px solid ${activeCategory === cat ? 'var(--red)' : 'var(--border)'}`
            }}>{cat}</button>
          ))}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>Sort:</span>
          {SORTS.map(s => (
            <button key={s.value} onClick={() => setSort(s.value)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: sort === s.value ? 'var(--bg3)' : 'none',
              color: sort === s.value ? 'var(--text)' : 'var(--text2)',
              border: `1px solid ${sort === s.value ? 'var(--border2)' : 'transparent'}`
            }}>{s.label}</button>
          ))}
        </div>

        {/* Start stream form */}
        {showStart && (
          <div className="fade-up" style={{
            background: 'var(--bg2)', border: '1px solid var(--red)44',
            borderRadius: 16, padding: 20, marginBottom: 24
          }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Start your stream
            </h3>

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

            {goLiveTab === 'browser' && (
              <>
                <input
                  value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Stream title (required)"
                  style={{
                    width: '100%', padding: '12px 14px', marginBottom: 12,
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--red)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                />
                <input
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  style={{
                    width: '100%', padding: '12px 14px', marginBottom: 12,
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    borderRadius: 10, color: 'var(--text)', fontSize: 14, outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--red)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border2)'}
                />
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Category</p>
                  <div className="cat-scroll">
                    {CATEGORIES.filter(c => c !== 'All').map(cat => (
                      <button key={cat} onClick={() => setCategory(cat)} className="cat-pill" style={{
                        background: category === cat ? 'var(--red)' : 'var(--bg3)',
                        color: category === cat ? '#fff' : 'var(--text2)',
                        border: 'none'
                      }}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={isPPV} onChange={e => setIsPPV(e.target.checked)} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Pay-per-view stream</span>
                  </label>
                  {isPPV && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>Price:</span>
                      <input
                        type="number" value={ppvPrice}
                        onChange={e => setPpvPrice(Number(e.target.value))}
                        min={10} style={{
                          width: 80, padding: '6px 10px',
                          background: 'var(--bg3)', border: '1px solid var(--border2)',
                          borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none'
                        }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>coins</span>
                    </div>
                  )}
                </div>
                <button onClick={startStream} disabled={starting || !title.trim()} style={{
                  width: '100%', padding: '13px 28px', background: 'var(--red)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: starting || !title.trim() ? 0.6 : 1
                }}>
                  <Radio size={16} /> {starting ? 'Starting...' : 'Start Stream'}
                </button>
              </>
            )}

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
                      color: 'var(--text)', fontSize: 13, outline: 'none', minWidth: 0
                    }} />
                    <button onClick={() => { navigator.clipboard.writeText('rtmp://localhost/live'); alert('✅ Copied!') }} style={{
                      padding: '8px 14px', background: 'var(--indigo)',
                      color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
                      flexShrink: 0
                    }}>Copy</button>
                  </div>
                </div>
                <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Stream Key</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input readOnly value={streamKey || 'Loading...'} type="password" style={{
                      flex: 1, padding: '8px 12px', background: 'var(--bg2)',
                      border: '1px solid var(--border)', borderRadius: 8,
                      color: 'var(--text)', fontSize: 13, outline: 'none', minWidth: 0
                    }} />
                    <button onClick={() => { navigator.clipboard.writeText(streamKey); alert('✅ Copied!') }} style={{
                      padding: '8px 14px', background: 'var(--indigo)',
                      color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, flexShrink: 0
                    }}>Copy</button>
                    <button onClick={regenerateKey} style={{
                      padding: '8px 12px', background: 'none',
                      color: 'var(--text2)', border: '1px solid var(--border)',
                      borderRadius: 8, cursor: 'pointer', fontSize: 12, flexShrink: 0
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

        {/* Stream grid */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>Loading...</div>
        )}

        {!loading && streams.length === 0 && (
          <div style={{
            textAlign: 'center', padding: 60, color: 'var(--text2)',
            background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
          }}>
            <Radio size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: 'var(--text)' }}>
              {search ? `No streams found for "${search}"` : 'No live streams right now'}
            </p>
            <p style={{ fontSize: 14 }}>
              {search ? 'Try a different search term' : 'Be the first to go live!'}
            </p>
          </div>
        )}

        <div className="live-grid">
          {streams.map((stream, i) => (
            <div key={stream._id} className="fade-up"
              onClick={() => navigate(`/live/${stream._id}`)}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                animationDelay: `${i * 0.05}s`, transition: 'transform 0.15s, border-color 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--red)44' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{
                height: 140, background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {stream.thumbnail ? (
                  <img src={stream.thumbnail} alt={stream.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Radio size={36} color="var(--red)" style={{ opacity: 0.5 }} />
                )}
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'var(--red)', color: '#fff',
                  padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'pulse-ring 1.5s infinite' }} />
                  LIVE
                </div>
                {stream.category && (
                  <div style={{
                    position: 'absolute', bottom: 8, left: 8,
                    background: '#00000088', color: '#fff',
                    padding: '2px 8px', borderRadius: 20, fontSize: 10
                  }}>{stream.category}</div>
                )}
                <div style={{
                  position: 'absolute', top: 8, right: 8,
                  background: '#00000088', color: '#fff',
                  padding: '2px 8px', borderRadius: 20, fontSize: 10,
                  display: 'flex', alignItems: 'center', gap: 3
                }}>
                  <Users size={10} /> {stream.viewerCount || 0}
                </div>
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <Avatar src={stream.host?.avatar} name={stream.host?.username} size={28} />
                  <p style={{ fontWeight: 700, fontSize: 12, color: 'var(--text2)' }}>{stream.host?.username}</p>
                </div>
                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, lineHeight: 1.4 }}>{stream.title}</p>
                <div style={{ display: 'flex', gap: 10, color: 'var(--text2)', fontSize: 11 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Heart size={10} /> {stream.likes?.length || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Users size={10} /> {stream.viewerCount || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}