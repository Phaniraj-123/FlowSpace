import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { Radio, Users, Heart, MessageCircle, Clock, TrendingUp, Zap, DollarSign } from 'lucide-react'
import API from "../api"


function formatDuration(seconds) {
    if (!seconds) return '0m'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

export default function StreamAnalytics() {
    const { token } = useAuthStore()
    const headers = { Authorization: `Bearer ${token}` }
    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get('${API}/api/livestream/analytics/me', { headers })
            .then(res => setData(res.data))
            .catch(err => console.log(err))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>
            Loading analytics...
        </div>
    )

    if (!data || data.overview.totalStreams === 0) return (
        <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: '0 24px' }}>
            <Radio size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                No streams yet
            </h2>
            <p style={{ color: 'var(--text2)', marginBottom: 24 }}>
                Start streaming to see your analytics here
            </p>
            <button onClick={() => navigate('/live')} style={{
                padding: '10px 24px', background: 'var(--red)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: 'pointer'
            }}>Go Live</button>
        </div>
    )

    const { overview, streamData, categoryBreakdown } = data

    const statCards = [
        { icon: <Radio size={18} />, label: 'Total streams', value: overview.totalStreams, color: '#ef4444' },
        { icon: <Users size={18} />, label: 'Total viewers', value: overview.totalViewers, color: '#6366f1' },
        { icon: <Users size={18} />, label: 'Peak viewers', value: overview.peakViewers, color: '#a855f7' },
        { icon: <Clock size={18} />, label: 'Total time', value: formatDuration(overview.totalDuration), color: '#3b82f6' },
        { icon: <Clock size={18} />, label: 'Avg duration', value: formatDuration(overview.avgDuration), color: '#06b6d4' },
        { icon: <Heart size={18} />, label: 'Total likes', value: overview.totalLikes, color: '#f43f5e' },
        { icon: <MessageCircle size={18} />, label: 'Chat messages', value: overview.totalMessages, color: '#22c55e' },
        { icon: <Zap size={18} />, label: 'Total donations', value: `🪙 ${overview.totalDonations}`, color: '#f59e0b' },
    ]

    // simple bar chart
    const maxViewers = Math.max(...streamData.map(s => s.peakViewers), 1)

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 100px' }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
                    Stream Analytics
                </h1>
                <p style={{ color: 'var(--text2)', fontSize: 14 }}>
                    Last {streamData.length} streams performance
                </p>
            </div>

            {/* Stats grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 14, marginBottom: 32
            }}>
                {statCards.map((stat, i) => (
                    <div key={i} style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        borderRadius: 14, padding: 16
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            color: stat.color, marginBottom: 8
                        }}>
                            {stat.icon}
                            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{stat.label}</span>
                        </div>
                        <p style={{
                            fontFamily: 'var(--font-display)', fontSize: 24,
                            fontWeight: 900, color: 'var(--text)'
                        }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Peak viewers chart */}
            <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 24, marginBottom: 24
            }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>
                    Peak viewers per stream
                </h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
                    {streamData.map((s, i) => (
                        <div key={i} style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 6, height: '100%',
                            justifyContent: 'flex-end'
                        }}>
                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>
                                {s.peakViewers}
                            </span>
                            <div style={{
                                width: '100%', borderRadius: 4,
                                background: s.isLive ? '#ef4444' : 'var(--indigo)',
                                height: `${Math.max((s.peakViewers / maxViewers) * 120, 4)}px`,
                                transition: 'height 0.3s ease',
                                cursor: 'pointer', position: 'relative'
                            }}
                                title={`${s.title} — ${s.peakViewers} peak viewers`}
                            />
                            <span style={{
                                fontSize: 9, color: 'var(--text2)',
                                textAlign: 'center', width: '100%',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--indigo)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Ended</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }} />
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Live</span>
                    </div>
                </div>
            </div>

            {/* Category breakdown */}
            <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 24, marginBottom: 24
            }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
                    Streams by category
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(categoryBreakdown)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, count]) => (
                            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 13, width: 100, color: 'var(--text2)' }}>{cat}</span>
                                <div style={{ flex: 1, background: 'var(--bg3)', borderRadius: 4, height: 8 }}>
                                    <div style={{
                                        height: '100%', borderRadius: 4,
                                        background: 'var(--indigo)',
                                        width: `${(count / overview.totalStreams) * 100}%`
                                    }} />
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--text2)', width: 20 }}>{count}</span>
                            </div>
                        ))}
                </div>
            </div>

            {/* Recent streams table */}
            <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: 24
            }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>
                    Recent streams
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {streamData.slice().reverse().map((s, i) => (
                        <div key={i} style={{
                            background: 'var(--bg3)', borderRadius: 12,
                            padding: '12px 16px',
                            display: 'grid',
                            gridTemplateColumns: '1fr auto auto auto auto',
                            gap: 16, alignItems: 'center'
                        }}>
                            <div>
                                <p style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</p>
                                <p style={{ fontSize: 11, color: 'var(--text2)' }}>
                                    {s.category} · {new Date(s.date).toLocaleDateString('en-IN')}
                                </p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 13, fontWeight: 700 }}>{s.peakViewers}</p>
                                <p style={{ fontSize: 10, color: 'var(--text2)' }}>peak</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 13, fontWeight: 700 }}>{formatDuration(s.duration)}</p>
                                <p style={{ fontSize: 10, color: 'var(--text2)' }}>duration</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 13, fontWeight: 700 }}>{s.likes}</p>
                                <p style={{ fontSize: 10, color: 'var(--text2)' }}>likes</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 13, fontWeight: 700 }}>🪙 {s.donations}</p>
                                <p style={{ fontSize: 10, color: 'var(--text2)' }}>earned</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}