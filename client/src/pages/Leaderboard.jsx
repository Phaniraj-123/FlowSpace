import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { Trophy, Clock, Users, Flame, Lock, Star } from 'lucide-react'
import Avatar from '../components/Avatar'
import API from "../api"


export default function Leaderboard() {
  const { token, user: me } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const navigate = useNavigate()
  const [leaderboard, setLeaderboard] = useState([])
  const [achievements, setAchievements] = useState(null)
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [lbType, setLbType] = useState('focus')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [lbType])

  async function fetchData() {
    setLoading(true)
    try {
      const [lbRes, achRes] = await Promise.all([
        axios.get(`${API}/api/leaderboard?type=${lbType}`, { headers }),
        axios.get('https://flowspace-3ief.onrender.com/api/leaderboard/achievements', { headers })
      ])
      setLeaderboard(lbRes.data)
      setAchievements(achRes.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  const rankColors = ['#f59e0b', '#9ca3af', '#b45309']
  const rankEmoji = ['🥇', '🥈', '🥉']

  const getValue = (user) => {
    if (lbType === 'focus') return `${user.totalFocusHours}h`
    if (lbType === 'followers') return `${user.followersCount} followers`
    if (lbType === 'streak') return `${user.streak} days`
  }



  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px 100px' }}>
      <h1 className="fade-up" style={{
        fontFamily: 'var(--font-display)', fontSize: 26,
        fontWeight: 800, marginBottom: 8
      }}>Leaderboard</h1>
      <p className="fade-up" style={{ color: 'var(--text2)', marginBottom: 24, fontSize: 14 }}>
        Compete with the community
      </p>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 4
      }}>
        {[
          { key: 'leaderboard', label: 'Rankings', icon: <Trophy size={14} /> },
          { key: 'achievements', label: 'Achievements', icon: <Star size={14} /> }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            flex: 1, padding: '8px', borderRadius: 8, border: 'none',
            background: activeTab === tab.key ? 'var(--indigo)' : 'none',
            color: activeTab === tab.key ? '#fff' : 'var(--text2)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s'
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <>
          {/* Type selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { key: 'focus', label: 'Focus Time', icon: <Clock size={13} /> },
              { key: 'followers', label: 'Followers', icon: <Users size={13} /> },
              { key: 'streak', label: 'Streak', icon: <Flame size={13} /> }
            ].map(t => (
              <button key={t.key} onClick={() => setLbType(t.key)} style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 13,
                fontWeight: 600, cursor: 'pointer',
                background: lbType === t.key ? 'var(--indigo)' : 'var(--bg2)',
                color: lbType === t.key ? '#fff' : 'var(--text2)',
                border: lbType === t.key ? 'none' : '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s'
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Top 3 podium */}
          {!loading && leaderboard.length >= 3 && (
            <div style={{
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              gap: 12, marginBottom: 24
            }}>
              {[leaderboard[1], leaderboard[0], leaderboard[2]].map((u, i) => {
                const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3
                const height = actualRank === 1 ? 120 : actualRank === 2 ? 95 : 80
                return (
                  <div key={u._id} onClick={() => navigate(`/user/${u.username}`)}
                    style={{
                      flex: 1, maxWidth: 160,
                      background: 'var(--bg2)', border: `1px solid ${rankColors[actualRank - 1]}44`,
                      borderRadius: 16, padding: '16px 12px',
                      textAlign: 'center', cursor: 'pointer',
                      height, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>
                    <span style={{ fontSize: 24 }}>{rankEmoji[actualRank - 1]}</span>
                    <Avatar src={u.avatar} name={u.username} size={36} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{u.username}</p>
                    <p style={{ fontSize: 11, color: rankColors[actualRank - 1], fontWeight: 700 }}>
                      {getValue(u)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading && <p style={{ textAlign: 'center', color: 'var(--text2)', padding: 40 }}>Loading...</p>}
            {leaderboard.map((u, i) => {
              const isMe = u.username === me?.username
              return (
                <div key={u._id} onClick={() => navigate(`/user/${u.username}`)}
                  className="fade-up"
                  style={{
                    background: isMe ? 'var(--indigo-dim)' : 'var(--bg2)',
                    border: `1px solid ${isMe ? 'var(--indigo)44' : 'var(--border)'}`,
                    borderRadius: 14, padding: '14px 18px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', animationDelay: `${i * 0.03}s`,
                    transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={e => { if (!isMe) e.currentTarget.style.borderColor = 'var(--indigo)44' }}
                  onMouseLeave={e => { if (!isMe) e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: i < 3 ? `${rankColors[i]}22` : 'var(--bg3)',
                    border: `1px solid ${i < 3 ? rankColors[i] + '44' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: i < 3 ? 16 : 12, fontWeight: 700,
                    color: i < 3 ? rankColors[i] : 'var(--text2)'
                  }}>
                    {i < 3 ? rankEmoji[i] : u.rank}
                  </div>

                  <Avatar name={u.username} size={36} />

                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>
                      {u.username} {isMe && <span style={{ color: 'var(--indigo-light)', fontSize: 12 }}>(you)</span>}
                    </p>
                  </div>

                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 15,
                    fontWeight: 800, color: i < 3 ? rankColors[i] : 'var(--text)'
                  }}>
                    {getValue(u)}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Achievements tab */}
      {activeTab === 'achievements' && achievements && (
        <div>
          {/* Progress */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 20, marginBottom: 20
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontWeight: 700, fontSize: 15 }}>Progress</p>
              <p style={{ color: 'var(--indigo-light)', fontWeight: 700 }}>
                {achievements.unlocked} / {achievements.total}
              </p>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 8 }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${(achievements.unlocked / achievements.total) * 100}%`,
                background: 'linear-gradient(90deg, var(--indigo), #8b5cf6)',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>

          {/* Achievements grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 12
          }}>
            {achievements.achievements.map((a, i) => (
              <div key={a.type} className="fade-up" style={{
                background: a.unlocked ? 'var(--bg2)' : 'var(--bg3)',
                border: `1px solid ${a.unlocked ? 'var(--indigo)44' : 'var(--border)'}`,
                borderRadius: 14, padding: 16, textAlign: 'center',
                opacity: a.unlocked ? 1 : 0.5,
                animationDelay: `${i * 0.03}s`,
                transition: 'transform 0.15s'
              }}
                onMouseEnter={e => { if (a.unlocked) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ fontSize: 32, marginBottom: 8, filter: a.unlocked ? 'none' : 'grayscale(1)' }}>
                  {a.unlocked ? a.icon : <Lock size={28} color="var(--text2)" />}
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{a.title}</p>
                <p style={{ color: 'var(--text2)', fontSize: 11, lineHeight: 1.4 }}>{a.description}</p>
                {a.unlocked && a.unlockedAt && (
                  <p style={{ color: 'var(--indigo-light)', fontSize: 10, marginTop: 8 }}>
                    {new Date(a.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}