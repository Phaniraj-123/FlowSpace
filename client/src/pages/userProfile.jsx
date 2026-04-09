import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { ArrowLeft, UserPlus, UserCheck, Heart, MessageCircle, Target, MoreVertical, X } from 'lucide-react'
import Avatar, { TierBadge } from '../components/Avatar'
import API from "../api"


export default function UserProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { token, user: me } = useAuthStore()
  const headers = { Authorization: `Bearer ${token}` }
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [goals, setGoals] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')
  const [loading, setLoading] = useState(true)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [showSubModal, setShowSubModal] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const moreMenuRef = useRef(null)

  useEffect(() => { fetchProfile() }, [username])

  useEffect(() => {
    function handleClickOutside(e) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) setShowMoreMenu(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchProfile() {
    try {
      setLoading(true)
      const [profileRes, postsRes] = await Promise.all([
        axios.get(`${API}/api/users/${username}`, { headers }),
        axios.get(`${API}/api/feed/user/${username}`, { headers })
      ])
      setProfile(profileRes.data)
      setPosts(postsRes.data)
      setIsFollowing(profileRes.data.followers?.some(f => f._id === me?.id))

      const goalsRes = await axios.get(
        `${API}/api/goals/user/${profileRes.data._id}`, { headers }
      )
      setGoals(goalsRes.data)
    } catch (err) { console.log(err) }
    finally { setLoading(false) }
  }

  async function toggleFollow() {
    try {
      if (isFollowing) {
        await axios.delete(`${API}/api/users/${profile._id}/follow`, { headers })
      } else {
        await axios.post(`${API}/api/users/${profile._id}/follow`, {}, { headers })
      }
      setIsFollowing(!isFollowing)
      fetchProfile()
    } catch (err) { console.log(err) }
  }

  async function blockUser() {
    if (!confirm(`Block @${profile.username}? They won't be able to see your posts.`)) return
    try {
      await axios.post(`${API}/api/settings/block/${profile._id}`, {}, { headers })
      setIsBlocked(true)
      setShowMoreMenu(false)
      alert(`🚫 @${profile.username} has been blocked`)
    } catch (err) { console.log(err) }
  }

  async function unblockUser() {
    try {
      await axios.delete(`${API}/api/settings/block/${profile._id}`, { headers })
      setIsBlocked(false)
      setShowMoreMenu(false)
    } catch (err) { console.log(err) }
  }

  async function subscribe(months, price) {
    setShowSubModal(false)
    try {
      const freshToken = useAuthStore.getState().token
      const orderRes = await axios.post('${API}/api/plans/create-order', {
        creatorId: profile._id, months, price
      }, { headers: { Authorization: `Bearer ${freshToken}` } })

      const { orderId, amount, currency, keyId } = orderRes.data
      const options = {
        key: keyId, amount, currency,
        name: 'FlowSpace',
        description: `${months} month subscription to ${profile.username}`,
        order_id: orderId,
        handler: async function (response) {
          const freshToken2 = useAuthStore.getState().token
          await axios.post('${API}/api/plans/verify', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            creatorId: profile._id, months, price
          }, { headers: { Authorization: `Bearer ${freshToken2}` } })
          setSubscription({ months })
          alert(`✅ Subscribed for ${months} month${months > 1 ? 's' : ''}!`)
        },
        prefill: { name: me?.name || me?.username, email: me?.email },
        theme: { color: '#6366f1' }
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      alert(err.response?.data?.error || 'Subscription failed')
    }
  }

  const UserListModal = ({ title, users, onClose }) => (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
        maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {users?.length === 0 && (
            <p style={{ color: 'var(--text2)', textAlign: 'center', padding: 20 }}>No users yet</p>
          )}
          {users?.map(u => (
            <div key={u._id} onClick={() => { onClose(); navigate(`/user/${u.username}`) }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <Avatar src={u.avatar} name={u.username} size={40} />
              <div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</p>
                {u.bio && <p style={{ fontSize: 12, color: 'var(--text2)' }}>{u.bio}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (loading) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>Loading...</div>
  if (!profile) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)' }}>User not found</div>

  const isOwnProfile = me?.username === username

  return (
    <>
      <style>{`
        .profile-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .profile-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .profile-follow-btn {
          padding: 9px 18px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .more-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          min-width: 180px;
          box-shadow: 0 8px 32px #0008;
          z-index: 300;
          overflow: hidden;
        }
        .more-menu-item {
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
          transition: background 0.1s;
        }
        .more-menu-item:hover { background: var(--bg2); }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 16px 100px' }}>

        {showFollowers && (
          <UserListModal
            title={`Followers (${profile.followers?.length || 0})`}
            users={profile.followers}
            onClose={() => setShowFollowers(false)}
          />
        )}
        {showFollowing && (
          <UserListModal
            title={`Following (${profile.following?.length || 0})`}
            users={profile.following}
            onClose={() => setShowFollowing(false)}
          />
        )}

        {/* Back */}
        <button onClick={() => navigate(-1)} style={{
          background: 'none', border: 'none', color: 'var(--text2)',
          cursor: 'pointer', fontSize: 14, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 6, padding: 0
        }}>
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile card */}
        <div className="fade-up" style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '20px 16px', marginBottom: 16
        }}>
          <div className="profile-header-row">
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
              <Avatar src={profile.avatar} name={profile.username} size={64} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <h2 style={{
                    fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {profile.username}
                  </h2>
                  <TierBadge tier={profile.subscriptionTier} />
                </div>
                {profile.bio && (
                  <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Actions: Follow + 3-dot */}
            <div className="profile-actions">
              {!isOwnProfile && (
                <button className="profile-follow-btn" onClick={toggleFollow} style={{
                  background: isFollowing ? 'var(--bg3)' : 'var(--indigo)',
                  color: isFollowing ? 'var(--text2)' : '#fff',
                  border: isFollowing ? '1px solid var(--border2)' : 'none',
                }}>
                  {isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
                </button>
              )}

              {isOwnProfile && (
                <button className="profile-follow-btn" onClick={() => navigate('/profile')} style={{
                  background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border2)'
                }}>
                  Edit Profile
                </button>
              )}

              {/* 3-dot menu for non-own profiles */}
              {!isOwnProfile && (
                <div style={{ position: 'relative' }} ref={moreMenuRef}>
                  <button onClick={() => setShowMoreMenu(prev => !prev)} style={{
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    borderRadius: 10, padding: '8px 10px', cursor: 'pointer',
                    color: 'var(--text2)', display: 'flex', alignItems: 'center'
                  }}>
                    <MoreVertical size={17} />
                  </button>

                  {showMoreMenu && (
                    <div className="more-menu">
                      {/* Subscribe option */}
                      {profile?.subscriptionTier && (
                        <button className="more-menu-item" onClick={() => { setShowMoreMenu(false); setShowSubModal(true) }}
                          style={{ color: subscription ? '#f59e0b' : 'var(--text)' }}>
                          ⭐ {subscription ? `Subscribed (${subscription.months}mo)` : 'Subscribe'}
                        </button>
                      )}

                      {/* Message */}
                      <button className="more-menu-item" onClick={() => { setShowMoreMenu(false); navigate('/messages') }}
                        style={{ color: 'var(--text)' }}>
                        <MessageCircle size={15} /> Message
                      </button>

                      {/* Divider */}
                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                      {/* Block/Unblock */}
                      <button className="more-menu-item"
                        onClick={isBlocked ? unblockUser : blockUser}
                        style={{ color: isBlocked ? '#f59e0b' : '#ef4444' }}>
                        {isBlocked ? '✅ Unblock' : '🚫 Block User'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <button onClick={() => setShowFollowers(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0
            }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {profile.followers?.length || 0}
              </span>
              <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 4 }}>followers</span>
            </button>

            <button onClick={() => setShowFollowing(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0
            }}>
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {profile.following?.length || 0}
              </span>
              <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 4 }}>following</span>
            </button>

            <div>
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {posts.length}
              </span>
              <span style={{ color: 'var(--text2)', fontSize: 13, marginLeft: 4 }}>posts</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="fade-up-2" style={{
          display: 'flex', gap: 4, marginBottom: 16,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 4
        }}>
          {['posts', 'goals'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '8px', borderRadius: 8, border: 'none',
              background: activeTab === tab ? 'var(--indigo)' : 'none',
              color: activeTab === tab ? '#fff' : 'var(--text2)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              textTransform: 'capitalize', transition: 'all 0.15s'
            }}>{tab}</button>
          ))}
        </div>

        {/* Posts */}
        {activeTab === 'posts' && (
          <div>
            {posts.length === 0 && (
              <div style={{
                textAlign: 'center', padding: 60, color: 'var(--text2)',
                background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
              }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
                <p>No posts yet</p>
              </div>
            )}
            {posts.map((post, i) => (
              <div key={post._id} className="fade-up"
                onClick={() => navigate(`/post/${post._id}`)}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '18px 16px', marginBottom: 12,
                  cursor: 'pointer', animationDelay: `${i * 0.05}s`, transition: 'border-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--indigo)44'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <p style={{ fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}>{post.content}</p>
                {post.image && (
                  <img src={post.image} alt="post" style={{
                    width: '100%', borderRadius: 10, marginBottom: 12,
                    maxHeight: 280, objectFit: 'cover'
                  }} />
                )}
                <div style={{ display: 'flex', gap: 16, color: 'var(--text2)', fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Heart size={13} /> {post.likes?.length || 0}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MessageCircle size={13} /> {post.comments?.length || 0}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 12 }}>
                    {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Goals */}
        {activeTab === 'goals' && (
          <div>
            {goals.length === 0 && (
              <div style={{
                textAlign: 'center', padding: 60, color: 'var(--text2)',
                background: 'var(--bg2)', borderRadius: 16, border: '1px solid var(--border)'
              }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🎯</p>
                <p>No public goals yet</p>
              </div>
            )}
            {goals.map((goal, i) => (
              <div key={goal._id} className="fade-up" style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '18px 16px', marginBottom: 12,
                animationDelay: `${i * 0.05}s`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Target size={16} color="var(--indigo)" />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, flex: 1 }}>
                    {goal.title}
                  </h3>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: goal.status === 'completed' ? 'var(--green)22' : 'var(--indigo)22',
                    color: goal.status === 'completed' ? 'var(--green)' : 'var(--indigo-light)',
                    textTransform: 'uppercase', flexShrink: 0
                  }}>{goal.status}</span>
                </div>
                {goal.description && (
                  <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 10 }}>{goal.description}</p>
                )}
                <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 6 }}>
                  <div style={{
                    height: '100%', borderRadius: 4, width: `${goal.progress}%`,
                    background: goal.progress === 100 ? 'var(--green)' : 'linear-gradient(90deg, var(--indigo), #8b5cf6)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>{goal.progress}% complete</p>
              </div>
            ))}
          </div>
        )}

        {/* Sub modal */}
        {showSubModal && (
          <div style={{
            position: 'fixed', inset: 0, background: '#00000088',
            zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 0
          }} onClick={() => setShowSubModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: '24px 24px 0 0', padding: 28,
              width: '100%', maxWidth: 480,
              animation: 'slideUp 0.25s ease'
            }}>
              {/* Handle */}
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 20px' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Avatar src={profile?.avatar} name={profile?.username} size={44} tier={profile?.subscriptionTier} />
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800 }}>
                    Subscribe to {profile?.name || profile?.username}
                  </h3>
                  <p style={{ color: 'var(--text2)', fontSize: 13 }}>Support your favourite creator</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {[
                  { months: 1, price: 99, label: '1 Month', badge: null, save: null },
                  { months: 3, price: 267, label: '3 Months', badge: '10% OFF', save: 'Save ₹30', color: '#6366f1' },
                  { months: 6, price: 475, label: '6 Months', badge: '20% OFF', save: 'Save ₹119', color: '#f59e0b' },
                ].map(plan => (
                  <div key={plan.months} onClick={() => subscribe(plan.months, plan.price)}
                    style={{
                      border: '1px solid var(--border)', borderRadius: 14,
                      padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
                      position: 'relative', background: 'var(--bg2)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.background = 'var(--indigo-dim)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg2)' }}
                  >
                    {plan.badge && (
                      <div style={{
                        position: 'absolute', top: -10, right: 14,
                        background: plan.color, color: '#fff',
                        padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800
                      }}>{plan.badge}</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15 }}>{plan.label}</p>
                        {plan.save && <p style={{ fontSize: 11, color: plan.color, marginTop: 2 }}>{plan.save}</p>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, fontSize: 16 }}>₹{plan.price}</p>
                        <p style={{ fontSize: 11, color: 'var(--text2)' }}>₹{Math.round(plan.price / plan.months)}/mo</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'center', marginBottom: 16 }}>
                Payments secured by Razorpay ⨃
              </p>
              <button onClick={() => setShowSubModal(false)} style={{
                width: '100%', padding: '12px', background: 'none',
                color: 'var(--text2)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer', fontSize: 13
              }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}